export const PROFESSIONAL_PROFILE_VISIBILITIES = ["PUBLIC", "SEARCH_ONLY", "HIDDEN"] as const;

export type ProfessionalProfileVisibility = typeof PROFESSIONAL_PROFILE_VISIBILITIES[number];

export const PROFESSIONAL_PROFILE_VISIBILITY_LABELS: Record<ProfessionalProfileVisibility, string> = {
  PUBLIC: "Público",
  SEARCH_ONLY: "Sem destaque",
  HIDDEN: "Oculto",
};

export function normalizeProfessionalProfileVisibility(value: unknown): ProfessionalProfileVisibility {
  return PROFESSIONAL_PROFILE_VISIBILITIES.includes(value as ProfessionalProfileVisibility)
    ? value as ProfessionalProfileVisibility
    : "PUBLIC";
}

export function canAppearOnPublicSurfaces(value: unknown) {
  return normalizeProfessionalProfileVisibility(value) !== "HIDDEN";
}

export function canAppearOnHome(value: unknown) {
  return normalizeProfessionalProfileVisibility(value) === "PUBLIC";
}
