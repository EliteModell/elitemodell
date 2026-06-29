export type VerificationUiState = "NOT_STARTED" | "IN_REVIEW" | "VERIFIED" | "REJECTED";

export const DIDIT_PROVIDER = "DIDIT";
export const KYC_APPROVED_STATUS = "APPROVED";
export const KYC_REJECTED_STATUS = "REJECTED";
export const KYC_PENDING_STATUS = "PENDING";

const PENDING_STATUSES = new Set([
  "PENDING",
  "PENDING_REVIEW",
  "DIDIT_PENDING",
  "PERSONA_PENDING",
  "KYC_MANUAL_PENDENTE",
  "MANUAL_REVIEW",
  "NEEDS_REVIEW",
  "NOT_STARTED",
  "NOT_SENT",
  "IN_PROGRESS",
  "IN_REVIEW",
  "AWAITING_USER",
  "RESUBMITTED",
]);

const REJECTED_STATUSES = new Set([
  "REJECTED",
  "DECLINED",
  "ABANDONED",
  "EXPIRED",
  "KYC_EXPIRED",
]);

function normalizeStatus(status?: string | null) {
  return (status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function verificationUiState(input: {
  kycStatus?: string | null;
  verifStatus?: string | null;
  docStatus?: string | null;
  rejectReason?: string | null;
  provider?: string | null;
  sessionId?: string | null;
}): VerificationUiState {
  const statuses = [input.kycStatus, input.verifStatus, input.docStatus].map(normalizeStatus).filter(Boolean);

  if (statuses.some((status) => status === KYC_APPROVED_STATUS || status === "VERIFIED")) return "VERIFIED";
  if (statuses.some((status) => REJECTED_STATUSES.has(status)) || input.rejectReason) return "REJECTED";
  if (statuses.some((status) => PENDING_STATUSES.has(status)) || input.sessionId) return "IN_REVIEW";
  return "NOT_STARTED";
}

export function verificationUiLabel(state: VerificationUiState) {
  return state === "VERIFIED"
    ? "Verificada"
    : state === "REJECTED"
      ? "Reprovada"
      : state === "IN_REVIEW"
        ? "Em analise"
        : "Nao iniciada";
}

export function diditAdminTone(state: VerificationUiState): "success" | "warning" | "danger" | "neutral" {
  if (state === "VERIFIED") return "success";
  if (state === "REJECTED") return "danger";
  if (state === "IN_REVIEW") return "warning";
  return "neutral";
}

export function diditFilterWhere(status?: string | null) {
  if (!status || status === "ALL") return undefined;
  if (status === "VERIFIED") return { kycStatus: { in: ["APPROVED", "VERIFIED"] } };
  if (status === "REJECTED") return { kycStatus: { in: ["REJECTED", "DECLINED"] } };
  if (status === "IN_REVIEW") {
    return {
      OR: [
        { kycStatus: { in: ["PENDING", "DIDIT_PENDING", "PERSONA_PENDING", "KYC_MANUAL_PENDENTE", "NEEDS_REVIEW", "PENDING_REVIEW"] } },
        { verifStatus: "PENDING" },
      ],
    };
  }
  return undefined;
}

export function isIdentityVerificationApproved(input: {
  kycStatus?: string | null;
  verifStatus?: string | null;
  docStatus?: string | null;
}) {
  return verificationUiState(input) === "VERIFIED";
}