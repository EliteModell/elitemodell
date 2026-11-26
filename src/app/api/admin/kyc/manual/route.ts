import { identityRuntimeEnabled } from "@/lib/manual-identity-runtime";
import { finalizeProfessionalRegistration } from "@/lib/finalize-professional-registration";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { sendManualIdentityEmail } from "@/lib/auth-email";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { assertPrivateIdentityBucket, identityBucket, identityPath, identityStorage, privateIdentityHeaders, sameIdentityOrigin } from "@/lib/manual-identity";
import { confirmedAdult, IDENTITY_CORRECTION_REASONS, identityParts, MANUAL_DOCUMENT_PROVIDER, type IdentityPart } from "@/lib/manual-identity-policy";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateIdentityHeaders });

export async function GET(req: Request) {
  if (!(await identityRuntimeEnabled())) return json({}, 404);
  const access = await authorizeAdminRequest("kyc:review");
  if (!access.ok) return json({}, access.status);
  const query = new URL(req.url).searchParams;
  const id = query.get("id") ?? "";
  const part = query.get("part") as IdentityPart;
  if (!/^[a-f0-9]{64}$/.test(id)) return json({}, 404);
  try {
    const attempt = await prisma.manualIdentityAttempt.findUnique({ where: { id } });
    if (!attempt?.submittedAt || attempt.purgedAt || attempt.purgeAfter <= new Date() ||
        !identityParts(attempt.backUnavailable).includes(part)) return json({}, 404);
    await assertPrivateIdentityBucket();
    const contents = await identityStorage.download(identityBucket, identityPath(id, part));
    await prisma.auditLog.create({ data: {
      adminId: access.session.user.id, action: "ADMIN_ACCESS", targetType: "USER", targetId: attempt.userId,
      reason: "Visualização de evidência documental manual",
      changes: { method: "MANUAL_DOCUMENT", attemptId: id, part },
    } });
    return new Response(new Uint8Array(contents), {
      headers: { ...privateIdentityHeaders, "Content-Type": "image/jpeg", "Content-Disposition": "inline" },
    });
  } catch {
    return json({ error: "Evidência indisponível." }, 503);
  }
}

export async function PATCH(req: Request) {
  if (!(await identityRuntimeEnabled())) return json({}, 404);
  if (!sameIdentityOrigin(req)) return json({}, 403);
  const access = await authorizeAdminRequest("kyc:review");
  if (!access.ok) return json({}, access.status);
  const body = await req.json().catch(() => null);
  const { id, status, version, reason, confirmed, birth, checks, correction } = body ?? {};
  if (typeof id !== "string" || !Number.isSafeInteger(version) || typeof reason !== "string" ||
      reason.trim().length < 5 || reason.length > 1000 || confirmed !== true ||
      !["APPROVED", "REJECTED", "RESUBMISSION_REQUESTED", "PENDING_REVIEW"].includes(status)) return json({}, 400);
  const correctionReason = (status === "REJECTED" || status === "RESUBMISSION_REQUESTED") &&
    typeof correction === "string" && Object.hasOwn(IDENTITY_CORRECTION_REASONS, correction)
    ? IDENTITY_CORRECTION_REASONS[correction as keyof typeof IDENTITY_CORRECTION_REASONS] : undefined;
  if (status === "APPROVED" && (typeof birth !== "string" || !confirmedAdult(birth) ||
      checks?.document !== true || checks?.portrait !== true || checks?.challenge !== true)) {
    return json({ error: "Confirme maioridade, documento válido, correspondência visual e desafio." }, 422);
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const attempt = await tx.manualIdentityAttempt.findUnique({ where: { id } });
      if (!attempt) return false;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"manual-identity:" + attempt.userId}))`;
      const active = await tx.manualIdentityAttempt.findFirst({
        where: { userId: attempt.userId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" },
      });
      if (active?.id !== id || active.reviewVersion !== version || active.status !== "PENDING_REVIEW" ||
          active.purgedAt || active.purgeAfter <= new Date()) return false;
      if (status === "APPROVED") {
        const account = await tx.user.findUnique({ where: { id: active.userId }, select: { blocked: true } });
        if (!account || account.blocked) return false;
        await assertPrivateIdentityBucket();
        const exists = await Promise.all(identityParts(active.backUnavailable).map((part) => identityStorage.exists(identityBucket, identityPath(id, part))));
        if (exists.includes(false)) return false;
      }
      const kycStatus = status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING";
      const linked = await tx.professional.updateMany({
        where: { userId: active.userId, kycProvider: MANUAL_DOCUMENT_PROVIDER, kycSessionId: id,
          verified: false, status: { in: ["DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED"] } },
        data: { kycStatus, docStatus: kycStatus, verifStatus: kycStatus },
      });
      if (linked.count === 0 && status === "APPROVED") return "PROFILE_NOT_LINKED" as const;
      await tx.manualIdentityAttempt.update({ where: { id }, data: {
        status, reviewVersion: { increment: 1 }, reviewerId: access.session.user.id,
        reviewedAt: new Date(), birthDate: status === "APPROVED" ? new Date(birth + "T00:00:00Z") : null,
      } });
      if (status === "APPROVED") {
        await finalizeProfessionalRegistration(tx, active.userId, { provider: MANUAL_DOCUMENT_PROVIDER, sessionId: id, submittedAt: active.submittedAt! });
      }
      await tx.auditLog.create({ data: {
        adminId: access.session.user.id, action: "ADMIN_ACCESS", targetType: "USER", targetId: active.userId,
        reason: reason.trim(), changes: { method: "MANUAL_DOCUMENT", attemptId: id, status,
          reviewedEvidence: identityParts(active.backUnavailable), publicCorrection: correctionReason, checks: status === "APPROVED" ? { document: true, portrait: true, challenge: true, adult: true } : undefined },
      } });
      if (status !== "PENDING_REVIEW") await tx.notification.create({ data: {
        userId: active.userId,
        type: "SYSTEM",
        title: "Atualização na verificação de identidade",
        body: status === "APPROVED" ? "Sua identidade foi verificada." : status === "REJECTED"
          ? "A análise da sua identidade foi concluída. Consulte o resultado."
          : "Precisamos que você envie novas fotos para confirmar sua identidade.",
        link: "/profissional/identidade",
      } });
      return { userId: active.userId };
    }, { timeout: 15_000 });
    if (updated === "PROFILE_NOT_LINKED") {
      return json({ error: "A tentativa não está vinculada ao cadastro vigente. Nenhuma aprovação foi gravada." }, 409);
    }
    if (updated) {
      revalidatePath("/admin/kyc/documental");
      revalidatePath("/admin/profissionais");
      revalidatePath("/profissional/novo");
    }
    if (updated && status !== "PENDING_REVIEW") {
      const event = status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "resubmission";
      after(async () => {
        try {
          const account = await prisma.user.findUnique({
            where: { id: updated.userId },
            select: { email: true, emailVerified: true, professional: { select: { id: true } } },
          });
          if (account?.email && account.emailVerified) await sendManualIdentityEmail({
            email: account.email, professionalId: account.professional?.id, attemptId: id,
            event, reviewVersion: version + 1, correctionReason,
          });
        } catch {
          // Delivery tracking records provider errors. A failed email must not undo the decision.
        }
      });
    }
    if (updated && status === "APPROVED") {
      after(async () => {
        const { processUploadAsset } = await import("@/lib/upload-quarantine");
        const assets = await prisma.uploadAsset.findMany({
          where: { userId: updated.userId, category: "image", folder: { startsWith: "profiles" },
            uploadCompletedAt: { not: null }, status: { notIn: ["APPROVED", "REJECTED"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true },
        });
        for (const asset of assets) {
          await processUploadAsset(asset.id).catch((error) => {
            console.warn("[manual-identity] revisão de mídia pendente", { assetId: asset.id, reason: error instanceof Error ? error.name : "unknown" });
          });
        }
      });
    }
    return updated ? json({ status }) : json({ error: "A tentativa mudou, expirou ou já foi decidida. Atualize a página." }, 409);
  } catch {
    return json({ error: "Não foi possível registrar a decisão." }, 503);
  }
}
