export const LEGACY_PROFESSIONAL_DRAFT_KEY = "elitemodell_professional_onboarding_v1";

export const PROFESSIONAL_REGISTRATION_TYPE = "PROFESSIONAL" as const;

export function professionalDraftStorageKey(userId: string) {
  return `elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:${PROFESSIONAL_REGISTRATION_TYPE}`;
}

export function isOwnedProfessionalDraft(
  value: unknown,
  userId: string,
): value is { ownerId: string; registrationType: typeof PROFESSIONAL_REGISTRATION_TYPE; step?: number; form?: Record<string, unknown> } {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return draft.ownerId === userId && draft.registrationType === PROFESSIONAL_REGISTRATION_TYPE;
}
