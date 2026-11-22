import "server-only";

import { recoverTrackedEmail } from "@/lib/email-delivery-recovery";
import { realAccountEmail } from "@/lib/account-email";
import { sendManualIdentityEmail } from "@/lib/auth-email";
import { manualIdentityEmailIdempotencyKey } from "@/lib/email-idempotency";
import { MANUAL_DOCUMENT_PROVIDER, manualAttemptAllowsPublication } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";

export async function checkManualIdentityApprovalEmail(attemptId: string) {
  const attempt = await prisma.manualIdentityAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || !manualAttemptAllowsPublication(attemptId, attempt)) return "unavailable";
  const [latest, account] = await Promise.all([
    prisma.manualIdentityAttempt.findFirst({
      where: { userId: attempt.userId, submittedAt: { not: null } },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: attempt.userId },
      select: { email: true, emailVerified: true, blocked: true, professional: {
        select: { id: true, kycProvider: true, kycSessionId: true, kycStatus: true },
      } },
    }),
  ]);
  const profile = account?.professional;
  const email = account?.emailVerified && !account.blocked ? realAccountEmail(account.email) : null;
  if (latest?.id !== attemptId || !email || profile?.kycProvider !== MANUAL_DOCUMENT_PROVIDER ||
      profile.kycSessionId !== attemptId || profile.kycStatus !== "APPROVED") return "unavailable";

  const key = manualIdentityEmailIdempotencyKey(attemptId, "approved", attempt.reviewVersion);
  return recoverTrackedEmail({
    key, professionalId: profile.id, email,
    send: (originalDeliveryId) => sendManualIdentityEmail({
      email, professionalId: profile.id, attemptId, event: "approved",
      reviewVersion: attempt.reviewVersion, retryForDeliveryId: originalDeliveryId,
    }),
  });
}
