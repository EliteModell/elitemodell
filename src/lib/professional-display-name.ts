const RESERVED_PROFESSIONAL_NAMES = new Set([
  "cadastro de acompanhante",
]);

function normalizedDisplayName(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isProfessionalDisplayNameReady(value?: string | null) {
  const normalized = normalizedDisplayName(value);
  return normalized.length >= 2 && !RESERVED_PROFESSIONAL_NAMES.has(normalized);
}

export const RESERVED_PUBLIC_PROFESSIONAL_NAMES = ["Cadastro de acompanhante"] as const;
