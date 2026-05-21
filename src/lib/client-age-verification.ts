export type ClientAgeVerificationStatus = "not_started" | "pending" | "verified" | "rejected";

export function normalizeClientAgeVerificationStatus(status?: string | null): ClientAgeVerificationStatus {
  if (status === "VERIFIED" || status === "verified") return "verified";
  if (status === "PENDING_REVIEW" || status === "pending") return "pending";
  if (status === "REJECTED" || status === "rejected") return "rejected";
  return "not_started";
}

export function isClientAgeVerified(status?: string | null) {
  return normalizeClientAgeVerificationStatus(status) === "verified";
}

export function clientAgeVerificationLabel(status: ClientAgeVerificationStatus) {
  if (status === "verified") return "Verificado";
  if (status === "pending") return "Em analise";
  if (status === "rejected") return "Reprovado";
  return "Nao verificado";
}
