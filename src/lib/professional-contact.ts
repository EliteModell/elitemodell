export const PROFESSIONAL_CONTACT_VISIBILITIES = [
  "PUBLIC",
  "LOGGED_IN",
  "PREMIUM",
] as const;

export type ProfessionalContactVisibility =
  (typeof PROFESSIONAL_CONTACT_VISIBILITIES)[number];

export function normalizeContactVisibility(
  value: string | null | undefined,
  hidePhone = false,
): ProfessionalContactVisibility {
  if (value === "PUBLIC" || value === "LOGGED_IN" || value === "PREMIUM") {
    return value;
  }
  return hidePhone ? "PREMIUM" : "PUBLIC";
}

export function canViewProfessionalContact(input: {
  visibility: ProfessionalContactVisibility;
  authenticated: boolean;
  premium: boolean;
  ownerOrAdmin?: boolean;
}) {
  if (input.ownerOrAdmin) return true;
  if (input.visibility === "PUBLIC") return true;
  if (input.visibility === "LOGGED_IN") return input.authenticated;
  return input.authenticated && input.premium;
}
