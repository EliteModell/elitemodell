const RESERVED_PROFESSIONAL_NAMES = new Set([
  "cadastro de acompanhante",
  "perfil em cadastro",
  "railson delas😈",
  "sofia teste",
  "teste profissional elite",
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

export function professionalDisplayNameForEditing(value?: string | null) {
  return RESERVED_PROFESSIONAL_NAMES.has(normalizedDisplayName(value)) ? "" : value?.trim() ?? "";
}

export const RESERVED_PUBLIC_PROFESSIONAL_NAMES = [
  "Cadastro de acompanhante",
  "Perfil em cadastro",
  "Railson Delas😈",
  "Sofia Teste",
  "Teste Profissional Elite",
] as const;
