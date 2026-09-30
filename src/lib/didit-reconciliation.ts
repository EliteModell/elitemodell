import { prisma } from "@/lib/prisma";
import { digitVendorDataBelongsToUser, fetchDigitSessionDecision, isSafeDigitVerificationUrl } from "@/lib/didit";
import { assessProfessionalDiditDecision } from "@/lib/professional-didit";

/** Serialize decision reads and writes with session creation for this account.
 * Webhook payloads are notifications: the current provider decision is authoritative.
 */
export async function reconcileProfessionalDidit(userId: string, sessionId: string) {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`didit-professional:${userId}`}))`;
    const professional = await tx.professional.findFirst({
      where: { userId, kycProvider: "DIDIT", kycSessionId: sessionId },
      select: { id: true, userId: true, status: true, verificationUrl: true, user: { select: { email: true, name: true } } },
    });
    if (!professional) throw new Error("didit_active_session_changed");
    const decision = await fetchDigitSessionDecision(sessionId);
    if (decision.session_id !== sessionId || !digitVendorDataBelongsToUser(decision.vendor_data, userId)) {
      throw new Error("didit_session_owner_mismatch");
    }
    const assessment = assessProfessionalDiditDecision(decision);
    const approved = assessment.status === "APPROVED";
    const rejected = assessment.status === "REJECTED";
    const resumable = ["Not Started", "In Progress", "Awaiting User", "Not Finished"].includes(decision.status);
    const candidateUrl = isSafeDigitVerificationUrl(decision.session_url) ? decision.session_url : professional.verificationUrl;
    const url = resumable && isSafeDigitVerificationUrl(candidateUrl) ? candidateUrl : null;
    await tx.user.updateMany({
      where: { id: userId, kycSessionId: sessionId },
      data: {
        clientStatus: approved ? "VERIFIED" : rejected ? "REJECTED" : "PENDING_REVIEW",
        kycReviewedAt: approved || rejected ? new Date() : null,
        kycRejectionReason: rejected ? assessment.reason : null,
      },
    });
    await tx.professional.updateMany({
      where: { userId, kycProvider: "DIDIT", kycSessionId: sessionId },
      data: {
        kycStatus: assessment.status,
        verifStatus: approved ? "APPROVED" : rejected ? "REJECTED" : "PENDING",
        docStatus: approved ? "APPROVED" : rejected ? "REJECTED" : "PENDING",
        // Never overwrite a manual moderation reason with identity status.
        rejectReason: professional.status === "REJECTED" || professional.status === "SUSPENDED"
          ? undefined : rejected ? assessment.reason : null,
        verificationUrl: url,
      },
    });
    return {
      response: { sessionId, status: assessment.status, rawStatus: decision.status,
        retryAllowed: assessment.retryAllowed, message: assessment.reason, url, starting: false },
      rejected, professionalId: professional.id ?? "", professionalUserId: professional.userId ?? "",
      email: professional.user?.email ?? null, name: professional.user?.name ?? null, reason: assessment.reason,
    };
  }, { maxWait: 5_000, timeout: 15_000 });

  if (outcome.rejected && outcome.professionalId && outcome.professionalUserId) {
    const recent = await prisma.notification.findFirst({
      where: { userId: outcome.professionalUserId, type: "KYC_REQUIRES_ACTION", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (!recent) {
      const [{ deliverProfessionalCommunication }, { sendProfessionalKycActionEmail }] = await Promise.all([
        import("@/lib/professional-communications"),
        import("@/lib/professional-extra-email"),
      ]);
      await deliverProfessionalCommunication({
        professionalId: outcome.professionalId, userId: outcome.professionalUserId, email: outcome.email,
        type: "KYC_REQUIRES_ACTION", notificationTitle: "Verificação de identidade precisa ser refeita",
        notificationBody: outcome.reason || "Abra seu cadastro e siga as instruções para refazer a verificação.",
        link: "/profissional/novo",
        send: () => sendProfessionalKycActionEmail(outcome.email!, outcome.name, outcome.reason),
      });
    }
  }
  return outcome.response;
}
