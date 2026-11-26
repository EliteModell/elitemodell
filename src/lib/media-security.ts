export const MEDIA_PASS_STATUSES = new Set(["PASS", "CLEAN", "APPROVED"]);

export const PROFILE_IMAGE_REENCODED = "IMAGE_REENCODED";

function mediaTechnicalCheckPassed(status?: string | null, profileImage = false) {
  return (profileImage && status === PROFILE_IMAGE_REENCODED) || Boolean(status && MEDIA_PASS_STATUSES.has(status.toUpperCase()));
}

export type MediaPublicationGateInput = {
  uploadComplete: boolean;
  category?: string | null;
  folder?: string | null;
  malwareStatus?: string | null;
  moderationStatus?: string | null;
  publicationDecisionType?: string | null;
  ageIdentityStatus?: string | null;
  consentStatus?: string | null;
  adminReviewRequired?: boolean | null;
  adminReviewStatus?: string | null;
  takedownStatus?: string | null;
  ownerId?: string | null;
};

export type MediaPublicationGate =
  | "UPLOAD_COMPLETE"
  | "MALWARE_SCAN"
  | "CONTENT_MODERATION"
  | "AGE_IDENTITY_REQUIREMENTS"
  | "CONSENT_REQUIREMENTS"
  | "ADMIN_REVIEW"
  | "TAKEDOWN_CLEAR"
  | "OWNER_PRESENT";

function passed(value?: string | null) {
  return Boolean(value && MEDIA_PASS_STATUSES.has(value.toUpperCase()));
}

function policyAttestationEnabled(value?: string | null) {
  return value === "POLICY_ATTESTATION"
    && process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED === "true";
}

export function evaluateMediaPublicationGates(input: MediaPublicationGateInput) {
  const profileImage = input.category === "image" && Boolean(input.folder?.startsWith("profiles"));
  const gates: Record<MediaPublicationGate, boolean> = {
    UPLOAD_COMPLETE: input.uploadComplete,
    MALWARE_SCAN: mediaTechnicalCheckPassed(input.malwareStatus, profileImage),
    CONTENT_MODERATION: passed(input.moderationStatus)
      || (input.malwareStatus !== PROFILE_IMAGE_REENCODED && policyAttestationEnabled(input.publicationDecisionType)),
    AGE_IDENTITY_REQUIREMENTS: passed(input.ageIdentityStatus),
    CONSENT_REQUIREMENTS: passed(input.consentStatus),
    ADMIN_REVIEW: (input.adminReviewRequired || input.malwareStatus === PROFILE_IMAGE_REENCODED) ? passed(input.adminReviewStatus) : true,
    TAKEDOWN_CLEAR: (input.takedownStatus ?? "CLEAR") === "CLEAR",
    OWNER_PRESENT: Boolean(input.ownerId),
  };
  const blockers = (Object.entries(gates) as Array<[MediaPublicationGate, boolean]>)
    .filter(([, ok]) => !ok)
    .map(([gate]) => gate);
  return { publishable: blockers.length === 0, blockers, gates };
}

export function isFailClosedSecurityStatus(value?: string | null) {
  return !passed(value);
}

export function mediaIsPublishable(asset: {
  id: string;
  userId: string;
  folder: string;
  category: string;
  status: string;
  approvedBucket: string | null;
  approvedPath: string | null;
  uploadCompletedAt: Date | null;
  malwareStatus: string;
  moderationStatus: string;
  publicationDecisionType: string;
  ageIdentityStatus: string;
  consentStatus: string;
  adminReviewRequired: boolean;
  adminReviewStatus: string;
  takedownStatus: string;
}) {
  return asset.status === "APPROVED"
    && asset.category === "image"
    && asset.folder.startsWith("profiles")
    && Boolean(asset.approvedBucket && asset.approvedPath)
    && evaluateMediaPublicationGates({
      category: asset.category, folder: asset.folder,
      uploadComplete: Boolean(asset.uploadCompletedAt),
      malwareStatus: asset.malwareStatus,
      moderationStatus: asset.moderationStatus,
      publicationDecisionType: asset.publicationDecisionType,
      ageIdentityStatus: asset.ageIdentityStatus,
      consentStatus: asset.consentStatus,
      adminReviewRequired: asset.adminReviewRequired,
      adminReviewStatus: asset.adminReviewStatus,
      takedownStatus: asset.takedownStatus,
      ownerId: asset.userId,
    }).publishable;
}
