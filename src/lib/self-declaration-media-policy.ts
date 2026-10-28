import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SELF_DECLARATION_MEDIA_POLICY_VERSION = "self-declaration-v1-disabled-by-default";

type PolicyResult = {
  allowed: false;
  policyVersion: string;
  blockers: string[];
  reason: string | null;
  evidence: null;
} | {
  allowed: true;
  policyVersion: string;
  blockers: [];
  reason: null;
  evidence: Prisma.InputJsonObject;
};

export async function evaluateSelfDeclarationPublication(assetId: string): Promise<PolicyResult> {
  if (process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED !== "true") {
    return {
      allowed: false,
      policyVersion: SELF_DECLARATION_MEDIA_POLICY_VERSION,
      blockers: ["POLICY_DISABLED"],
      reason: "A publicacao por autodeclaracao nao esta ativada.",
      evidence: null,
    };
  }

  const asset = await prisma.uploadAsset.findUnique({
    where: { id: assetId },
    include: {
      owner: {
        select: {
          id: true,
          blocked: true,
          termsConsent: true,
          lgpdConsent: true,
          professional: {
            select: {
              id: true,
              status: true,
              verified: true,
              kycStatus: true,
              kycSessionId: true,
              registrationSubmittedAt: true,
            },
          },
        },
      },
      depictedPeople: true,
    },
  });
  if (!asset) {
    return { allowed: false, policyVersion: SELF_DECLARATION_MEDIA_POLICY_VERSION, blockers: ["ASSET_NOT_FOUND"], reason: "Midia inexistente.", evidence: null };
  }

  const declaration = await prisma.contentDeclaration.findFirst({
    where: {
      userId: asset.userId,
      fileHash: asset.fileHash,
      declarationKey: "content-authorization-declaration",
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, version: true, createdAt: true },
  });
  const professional = asset.owner.professional;
  const profileMedia = (asset.category === "image" && asset.folder.startsWith("profiles"))
    || (asset.category === "video" && asset.folder.startsWith("profile-videos"));
  const declaredPeopleValid = asset.depictedPeople.length > 0 && asset.depictedPeople.every((person) => (
    person.relationship === "SELF_DECLARED"
    && person.isUploader
    && person.isContentOwner
    && person.ageStatus === "PASS"
    && person.consentStatus === "PASS"
    && !person.revokedAt
  ));
  const reportTargets = [asset.id, asset.controlledUrl, asset.userId, professional?.id]
    .filter((value): value is string => Boolean(value));
  const openReport = await prisma.report.findFirst({
    where: { status: { in: ["PENDING", "REVIEWING"] }, targetId: { in: reportTargets } },
    select: { id: true },
  });

  const blockers = [
    !profileMedia ? "NOT_PROFILE_MEDIA" : null,
    asset.malwareStatus !== "CLEAN" && asset.malwareStatus !== "APPROVED" ? "MALWARE_SCAN" : null,
    asset.moderationStatus !== "PENDING" || asset.moderationProvider !== "MANUAL" ? "CONTENT_DECISION_NOT_ELIGIBLE" : null,
    asset.ageIdentityStatus !== "PASS" ? "AGE_IDENTITY" : null,
    asset.consentStatus !== "PASS" ? "CONSENT" : null,
    asset.takedownStatus !== "CLEAR" ? "TAKEDOWN" : null,
    asset.owner.blocked ? "ACCOUNT_BLOCKED" : null,
    !asset.owner.termsConsent || !asset.owner.lgpdConsent ? "TERMS" : null,
    !professional?.registrationSubmittedAt ? "REGISTRATION_NOT_SUBMITTED" : null,
    !professional?.verified || professional.kycStatus !== "APPROVED" || !professional.kycSessionId ? "KYC" : null,
    !["PENDING_REVIEW", "ACTIVE"].includes(professional?.status ?? "") ? "PROFESSIONAL_STATUS" : null,
    !declaration ? "DECLARATION" : null,
    !declaredPeopleValid ? "DEPICTED_PEOPLE_DECLARATION" : null,
    openReport ? "OPEN_REPORT" : null,
  ].filter((value): value is string => Boolean(value));

  const evidence: Prisma.InputJsonObject = {
    policyNature: "SELF_DECLARATION_WITH_REACTIVE_MODERATION",
    visualAnalysisPerformed: false,
    userId: asset.userId,
    professionalId: professional?.id ?? null,
    kycSessionReference: professional?.kycSessionId ?? null,
    contentDeclarationId: declaration?.id ?? null,
    contentDeclarationVersion: declaration?.version ?? null,
    contentDeclarationAt: declaration?.createdAt.toISOString() ?? null,
    depictedPeopleRecordIds: asset.depictedPeople.map((person) => person.id),
    fileHash: asset.fileHash,
    malwareStatus: asset.malwareStatus,
    moderationStatus: asset.moderationStatus,
    moderationProvider: asset.moderationProvider,
    takedownStatus: asset.takedownStatus,
    openReport: Boolean(openReport),
  };
  if (blockers.length) {
    return {
      allowed: false,
      policyVersion: SELF_DECLARATION_MEDIA_POLICY_VERSION,
      blockers,
      reason: `Excecao da politica: ${blockers.join(", ")}.`,
      evidence: null,
    };
  }
  return {
    allowed: true,
    policyVersion: SELF_DECLARATION_MEDIA_POLICY_VERSION,
    blockers: [],
    reason: null,
    evidence,
  };
}
