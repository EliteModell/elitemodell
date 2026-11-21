import { createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isProfessionalCategory } from "@/lib/account-routes";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync } from "@/lib/security";
import { assertPrivateIdentityBucket, identityBucket, identityPath, identityStorage, normalizeIdentityImage, privateIdentityHeaders, sameIdentityOrigin } from "@/lib/manual-identity";
import { brazilDate, identityEnabled, identityParts, IDENTITY_DOCUMENTS, IDENTITY_NOTICE_VERSION, IDENTITY_RETENTION_DAYS, MANUAL_DOCUMENT_PROVIDER, shouldReviewRegistrationManually } from "@/lib/manual-identity-policy";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateIdentityHeaders });
const select = { id: true, status: true, documentType: true, submittedAt: true, purgeAfter: true } as const;

async function professionalAccount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, blocked: true, emailVerified: true, phoneVerified: true, accountType: true, category: true, kycSessionId: true, professional: { select: { kycStatus: true, verified: true, kycProvider: true, kycSessionId: true, verificationUrl: true } } },
  });
  if (!user || user.blocked || (!user.professional && !["model", "professional"].includes(user.accountType) && !isProfessionalCategory(user.category))) return null;
  return { canSubmit: Boolean(user.emailVerified && user.phoneVerified), manual: shouldReviewRegistrationManually(user.professional, user.kycSessionId), userId: user.id, verified: user.professional?.verified ?? false, kycStatus: user.professional?.kycStatus };
}

export async function GET() {
  if (!identityEnabled()) return json({}, 404);
  const professional = await professionalAccount();
  if (!professional) return json({ error: "Cadastro profissional necessário." }, 403);
  const attempt = await prisma.manualIdentityAttempt.findFirst({
    where: { userId: professional.userId, submittedAt: { not: null } },
    select,
    orderBy: { submittedAt: "desc" },
  });
  return json({ manualDefault: professional.manual, attempt: attempt && { id: attempt.id, documentType: attempt.documentType, submittedAt: attempt.submittedAt, status: attempt.status === "PENDING_REVIEW" && attempt.purgeAfter <= new Date() ? "RESUBMISSION_REQUESTED" : attempt.status }, verified: professional.verified || professional.kycStatus === "APPROVED", challengeDate: brazilDate() });
}

export async function POST(req: Request) {
  if (!identityEnabled()) return json({}, 404);
  if (!sameIdentityOrigin(req)) return json({}, 403);
  const professional = await professionalAccount();
  if (!professional) return json({}, 403);
  if (!professional.canSubmit) return json({ error: "Confirme seu telefone e e-mail antes de enviar os documentos." }, 403);
  if (!professional.manual) return json({ error: "Use a verificação em andamento do seu cadastro." }, 409);
  if (professional.verified || professional.kycStatus === "APPROVED") return json({ error: "Sua identidade já foi verificada." }, 409);
  const limited = await enforceRateLimitAsync("manual-identity:" + professional.userId, 8, 15 * 60_000);
  if (limited) return limited;
  const size = Number(req.headers.get("content-length"));
  if (!Number.isSafeInteger(size) || size < 1 || size > 4_000_000) return json({ error: "Envio inválido ou muito grande." }, 413);
  const form = await req.formData().catch(() => null);
  const requestId = form?.get("requestId");
  const documentType = form?.get("documentType");
  const backUnavailable = form?.get("backUnavailable") === "true";
  const challengeDate = brazilDate();
  if (typeof requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId) ||
      !IDENTITY_DOCUMENTS.some((type) => type === documentType) || typeof documentType !== "string" ||
      form?.get("notice") !== IDENTITY_NOTICE_VERSION || form?.get("challengeDate") !== challengeDate ||
      (backUnavailable && form?.get("back") !== null)) {
    return json({ error: "Revise o documento, a data da foto e o aviso de privacidade." }, 400);
  }
  const parts = identityParts(backUnavailable);
  let images: Buffer[];
  try {
    images = await Promise.all(parts.map((part) => {
      const file = form?.get(part);
      if (!(file instanceof File) || form?.getAll(part).length !== 1) throw new Error();
      return normalizeIdentityImage(file);
    }));
  } catch {
    return json({ error: "Confira as fotos obrigatórias. Envie imagens nítidas, com pelo menos 480 pixels de cada lado." }, 422);
  }

  const hashes = images.map((image) => createHash("sha256").update(image).digest("hex"));
  if (new Set(hashes).size !== images.length) {
    return json({ error: "Envie uma foto diferente para cada etapa." }, 422);
  }

  const { userId } = professional;
  const id = createHash("sha256").update(userId + ":" + requestId).digest("hex");
  const lockKey = "manual-identity:" + userId;
  try {
    await assertPrivateIdentityBucket();
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const existing = await tx.manualIdentityAttempt.findUnique({ where: { id } });
      if (existing) return existing.userId === userId && existing.documentType === documentType &&
        existing.backUnavailable === backUnavailable && existing.challengeDate === challengeDate && JSON.stringify(existing.evidenceHashes) === JSON.stringify(hashes) ? existing : null;
      const latest = await tx.manualIdentityAttempt.findFirst({
        where: { userId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" },
      });
      if (latest && !["REJECTED", "RESUBMISSION_REQUESTED"].includes(latest.status) && (latest.status === "APPROVED" || latest.purgeAfter > new Date())) return null;
      return tx.manualIdentityAttempt.create({
        data: { id, userId, documentType, backUnavailable, challengeDate, evidenceHashes: hashes, noticeVersion: IDENTITY_NOTICE_VERSION,
          purgeAfter: new Date(Date.now() + 86_400_000) },
      });
    });
    if (!reservation) return json({ error: "Já existe uma verificação em andamento ou concluída." }, 409);
    const attempt = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const current = await tx.manualIdentityAttempt.findUniqueOrThrow({ where: { id } });
      if (current.submittedAt) return { id, status: current.status };
      const [latest, account] = await Promise.all([
        tx.manualIdentityAttempt.findFirst({ where: { userId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" } }),
        tx.user.findUnique({ where: { id: userId }, select: { blocked: true, emailVerified: true, phoneVerified: true, kycSessionId: true, professional: { select: { verified: true, kycStatus: true, kycProvider: true, kycSessionId: true, verificationUrl: true } } } }),
      ]);
      if (!account || account.blocked || !account.emailVerified || !account.phoneVerified || !shouldReviewRegistrationManually(account.professional, account.kycSessionId) || account.professional?.verified || account.professional?.kycStatus === "APPROVED" || current.purgedAt ||
          current.purgeAfter <= new Date() ||
          (latest && (latest.status === "APPROVED" || (latest.purgeAfter > new Date() && !["REJECTED", "RESUBMISSION_REQUESTED"].includes(latest.status))))) return null;
      for (const [index, part] of parts.entries()) {
        await identityStorage.upload({ bucket: identityBucket, path: identityPath(id, part), contents: images[index]!, contentType: "image/jpeg", overwrite: false, cacheControl: "0" });
      }
      const submittedAt = new Date();
      await tx.professional.updateMany({
        where: { userId, verified: false, status: { in: ["DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED"] } },
        data: { kycProvider: MANUAL_DOCUMENT_PROVIDER, kycSessionId: id, kycStatus: "PENDING", docStatus: "PENDING", verifStatus: "PENDING", verificationType: "documental_manual" },
      });
      return tx.manualIdentityAttempt.update({ where: { id }, select,
        data: { status: "PENDING_REVIEW", submittedAt, purgeAfter: new Date(submittedAt.getTime() + IDENTITY_RETENTION_DAYS * 86_400_000) },
      });
    }, { timeout: 25_000 });
    return attempt ? json({ attempt }) : json({ error: "A tentativa expirou ou já existe outra verificação." }, 409);
  } catch {
    return json({ error: "Não foi possível enviar agora. Tente novamente com as mesmas fotos." }, 503);
  }
}
