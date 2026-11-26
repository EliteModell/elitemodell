import type { Prisma } from "@prisma/client";
import { professionalSubmissionCompletion } from "@/lib/professional-completeness";
import { controlledMediaAssetId } from "@/lib/public-professional-media";

export async function finalizeProfessionalRegistration(
  tx: Prisma.TransactionClient,
  userId: string,
  identity: { provider: string; sessionId: string; submittedAt: Date },
  apply = true,
) {
  const profile = await tx.professional.findUnique({
    where: { userId },
    include: {
      photos: { where: { hiddenAt: null }, select: { url: true, cover: true } },
      specialties: { select: { id: true } },
      user: { select: { blocked: true, emailVerified: true, phoneVerified: true, termsConsent: true, lgpdConsent: true } },
    },
  });
  if (!profile || !["DRAFT", "PENDING_REVIEW"].includes(profile.status) || profile.verified
    || profile.user.blocked || !profile.user.phoneVerified || !profile.user.termsConsent || !profile.user.lgpdConsent
    || profile.kycProvider !== identity.provider || profile.kycSessionId !== identity.sessionId
    || !professionalSubmissionCompletion({ ...profile, emailVerified: profile.user.emailVerified }).readyToSubmit) return false;
  if (profile.status === "PENDING_REVIEW" && profile.registrationSubmittedAt) return true;

  const cover = profile.photos.find((photo) => photo.cover) ?? (profile.photos.length === 1 ? profile.photos[0] : null);
  const assetId = controlledMediaAssetId(cover?.url);
  if (!assetId || !await tx.uploadAsset.findFirst({
    where: { id: assetId, userId, folder: { startsWith: "profiles" }, category: "image", uploadCompletedAt: { not: null } },
    select: { id: true },
  })) return false;
  if (!apply) return true;

  const updated = await tx.professional.updateMany({
    where: { id: profile.id, status: profile.status, verified: false, registrationSubmittedAt: profile.registrationSubmittedAt,
      kycSessionId: identity.sessionId, kycStatus: profile.kycStatus, updatedAt: profile.updatedAt },
    data: { status: "PENDING_REVIEW", registrationSubmittedAt: profile.registrationSubmittedAt ?? identity.submittedAt, completionRulesVersion: 2 },
  });
  if (!updated.count) throw new Error("registration_changed_during_submission");

  await tx.auditLog.create({ data: {
    actorIdentifier: "registration-finalization",
    action: "SETTINGS_CHANGED",
    targetType: "PROFESSIONAL",
    targetId: profile.id,
    changes: { resultingStatus: "PENDING_REVIEW", provider: identity.provider },
  } });
  return true;
}
