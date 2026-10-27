export const AUTOMATED_MEDIA_MODERATION_CONTRACT = "elite-media-moderation/v1";

export type MediaRiskDecision = "CLEAR" | "REVIEW" | "BLOCK";
export type MediaContentRating = "STANDARD" | "ADULT_SUGGESTIVE" | "ADULT_EXPLICIT";

export type AutomatedMediaModerationEvidence = {
  contractVersion?: unknown;
  decision?: unknown;
  policyVersion?: unknown;
  providerTaskId?: unknown;
  mediaKind?: unknown;
  contentRating?: unknown;
  analysis?: { complete?: unknown; fullDurationCovered?: unknown; audioAnalyzed?: unknown } | null;
  file?: { integrityPassed?: unknown; normalized?: unknown } | null;
  people?: {
    count?: unknown;
    uploaderIdentityMatched?: unknown;
    allAdultsVerified?: unknown;
    allConsentsVerified?: unknown;
  } | null;
  risks?: {
    minor?: unknown;
    illegal?: unknown;
    nonConsensual?: unknown;
    coercion?: unknown;
    violence?: unknown;
  } | null;
};

export type AutomatedMediaModerationDecision = {
  outcome: "APPROVE" | "REVIEW" | "REJECT";
  contentRating: MediaContentRating | null;
  blockers: string[];
  auditSummary: Record<string, unknown>;
};

const RATINGS = new Set<MediaContentRating>(["STANDARD", "ADULT_SUGGESTIVE", "ADULT_EXPLICIT"]);
const RISK_KEYS = ["minor", "illegal", "nonConsensual", "coercion", "violence"] as const;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function risk(value: unknown): MediaRiskDecision | null {
  const normalized = text(value)?.toUpperCase();
  return normalized === "CLEAR" || normalized === "REVIEW" || normalized === "BLOCK" ? normalized : null;
}

export function evaluateAutomatedMediaModeration(
  evidence: AutomatedMediaModerationEvidence | null | undefined,
  expectedMediaKind: "image" | "video",
): AutomatedMediaModerationDecision {
  const blockers: string[] = [];
  const declaredDecision = text(evidence?.decision)?.toUpperCase();
  const contractVersion = text(evidence?.contractVersion);
  const policyVersion = text(evidence?.policyVersion);
  const providerTaskId = text(evidence?.providerTaskId);
  const mediaKind = text(evidence?.mediaKind)?.toLowerCase();
  const ratingValue = text(evidence?.contentRating)?.toUpperCase();
  const contentRating = ratingValue && RATINGS.has(ratingValue as MediaContentRating)
    ? ratingValue as MediaContentRating
    : null;

  if (contractVersion !== AUTOMATED_MEDIA_MODERATION_CONTRACT) blockers.push("CONTRACT_VERSION");
  if (!policyVersion) blockers.push("POLICY_VERSION");
  if (!providerTaskId) blockers.push("PROVIDER_TASK_ID");
  if (mediaKind !== expectedMediaKind) blockers.push("MEDIA_KIND");
  if (!contentRating) blockers.push("CONTENT_RATING");
  if (evidence?.analysis?.complete !== true) blockers.push("ANALYSIS_INCOMPLETE");
  if (expectedMediaKind === "video" && evidence?.analysis?.fullDurationCovered !== true) blockers.push("VIDEO_NOT_FULLY_ANALYZED");
  if (expectedMediaKind === "video" && evidence?.analysis?.audioAnalyzed !== true) blockers.push("AUDIO_NOT_ANALYZED");
  if (evidence?.file?.integrityPassed !== true) blockers.push("FILE_INTEGRITY");
  if (evidence?.file?.normalized !== true) blockers.push("FILE_NOT_NORMALIZED");
  if (evidence?.people?.count !== 1) blockers.push("PEOPLE_COUNT");
  if (evidence?.people?.uploaderIdentityMatched !== true) blockers.push("IDENTITY_MATCH");
  if (evidence?.people?.allAdultsVerified !== true) blockers.push("AGE_VERIFICATION");
  if (evidence?.people?.allConsentsVerified !== true) blockers.push("CONSENT_VERIFICATION");

  const normalizedRisks = Object.fromEntries(RISK_KEYS.map((key) => [key, risk(evidence?.risks?.[key])])) as Record<typeof RISK_KEYS[number], MediaRiskDecision | null>;
  for (const key of RISK_KEYS) {
    if (normalizedRisks[key] !== "CLEAR") blockers.push(`RISK_${key.toUpperCase()}`);
  }

  const providerRejected = declaredDecision === "REJECT" || Object.values(normalizedRisks).includes("BLOCK");
  const outcome = providerRejected ? "REJECT" : declaredDecision === "APPROVE" && blockers.length === 0 ? "APPROVE" : "REVIEW";

  return {
    outcome,
    contentRating,
    blockers,
    auditSummary: {
      contractVersion,
      policyVersion,
      providerTaskId,
      mediaKind,
      contentRating,
      decision: declaredDecision,
      risks: normalizedRisks,
      analysisComplete: evidence?.analysis?.complete === true,
      fullDurationCovered: evidence?.analysis?.fullDurationCovered === true,
      audioAnalyzed: evidence?.analysis?.audioAnalyzed === true,
      fileNormalized: evidence?.file?.normalized === true,
      peopleCount: typeof evidence?.people?.count === "number" ? evidence.people.count : null,
    },
  };
}
