export const MEDIA_PASS_STATUSES = new Set(["PASS", "CLEAN", "APPROVED"]);

export type MediaPublicationGateInput = {
  uploadComplete: boolean;
  malwareStatus?: string | null;
  moderationStatus?: string | null;
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

export function evaluateMediaPublicationGates(input: MediaPublicationGateInput) {
  const gates: Record<MediaPublicationGate, boolean> = {
    UPLOAD_COMPLETE: input.uploadComplete,
    MALWARE_SCAN: passed(input.malwareStatus),
    CONTENT_MODERATION: passed(input.moderationStatus),
    AGE_IDENTITY_REQUIREMENTS: passed(input.ageIdentityStatus),
    CONSENT_REQUIREMENTS: passed(input.consentStatus),
    ADMIN_REVIEW: input.adminReviewRequired ? passed(input.adminReviewStatus) : true,
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
