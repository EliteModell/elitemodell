import { MEDIA_PASS_STATUSES, PROFILE_IMAGE_REENCODED } from "@/lib/media-security";
import { MANUAL_DOCUMENT_PROVIDER } from "@/lib/manual-identity-policy";

export type ManualMediaReviewInput = {
  category: string;
  folder: string;
  uploadCompletedAt: Date | string | null;
  malwareStatus: string;
  ageIdentityStatus: string;
  consentStatus: string;
  takedownStatus: string;
  ownerBlocked: boolean;
  professionalStatus?: string | null;
  professionalVerified?: boolean | null;
  professionalKycStatus?: string | null;
  professionalKycProvider?: string | null;
  professionalRegistrationSubmittedAt?: Date | string | null;
  depictedPeople?: Array<{
    ageStatus: string;
    consentStatus: string;
    revokedAt?: Date | string | null;
  }>;
  hasOpenReport?: boolean;
};

function passed(value?: string | null) {
  return Boolean(value && MEDIA_PASS_STATUSES.has(value.toUpperCase()));
}

export function manualMediaReviewBlockers(input: ManualMediaReviewInput) {
  const blockers: string[] = [];
  const isProfileImage = input.category === "image" && input.folder.startsWith("profiles");
  const isProfileVideo = input.category === "video" && input.folder.startsWith("profile-videos");
  if (!isProfileImage && !isProfileVideo) blockers.push("NOT_PROFILE_MEDIA");
  if (!input.uploadCompletedAt) blockers.push("UPLOAD_INCOMPLETE");
  if (!passed(input.malwareStatus) && !(isProfileImage && input.malwareStatus === PROFILE_IMAGE_REENCODED)) blockers.push("MALWARE_SCAN");
  if (!passed(input.ageIdentityStatus)) blockers.push("AGE_IDENTITY");
  if (!passed(input.consentStatus)) blockers.push("CONSENT");
  if (input.takedownStatus !== "CLEAR") blockers.push("TAKEDOWN");
  if (input.ownerBlocked) blockers.push("OWNER_BLOCKED");
  const publishedProfessional = input.professionalStatus === "ACTIVE" && input.professionalVerified;
  const submittedProfessional = Boolean(input.professionalRegistrationSubmittedAt)
    && ["DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED"].includes(input.professionalStatus ?? "");
  const verifiedDocumentDraft = isProfileImage && input.professionalStatus === "DRAFT" &&
    input.professionalKycProvider === MANUAL_DOCUMENT_PROVIDER;
  if ((!publishedProfessional && !submittedProfessional && !verifiedDocumentDraft) || input.professionalKycStatus !== "APPROVED") {
    blockers.push("PROFESSIONAL_NOT_ELIGIBLE");
  }
  if (!input.depictedPeople?.length || input.depictedPeople.some((person) => (
    !passed(person.ageStatus) || !passed(person.consentStatus) || Boolean(person.revokedAt)
  ))) blockers.push("DEPICTED_PEOPLE");
  if (input.hasOpenReport) blockers.push("OPEN_REPORT");
  return blockers;
}

export function isReadyForHumanContentReview(input: ManualMediaReviewInput) {
  return manualMediaReviewBlockers(input).length === 0;
}
