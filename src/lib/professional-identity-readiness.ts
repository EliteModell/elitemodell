export function canFinalizeProfessionalIdentity(sessionId: string, eligibleSessionId: string | null, status: string) {
  return sessionId.length > 0 && eligibleSessionId === sessionId && (status === "APPROVED" || status === "PENDING");
}
