export type ServiceDirection = "DO" | "RECEIVE" | "BOTH";

export type ProfessionalServiceOption = {
  id: string;
  label: string;
  directions?: readonly ServiceDirection[];
  legacyLabels?: readonly string[];
};

export type ProfessionalServiceCategory = {
  id: string;
  label: string;
  options: readonly ProfessionalServiceOption[];
};

export const SERVICE_DIRECTION_LABELS: Record<ServiceDirection, string> = {
  DO: "Faço",
  RECEIVE: "Recebo",
  BOTH: "Faço e recebo",
};

export const PROFESSIONAL_SERVICE_CATEGORIES: readonly ProfessionalServiceCategory[] = [
  {
    id: "companionship",
    label: "Acompanhamento",
    options: [
      { id: "companionship", label: "Acompanhamento" },
      { id: "dinner", label: "Jantar a dois" },
      { id: "travel", label: "Viagens" },
      { id: "events", label: "Festas e eventos" },
      { id: "overnight", label: "Pernoite" },
      { id: "weekend", label: "Final de semana" },
      { id: "hotels", label: "Hotéis" },
      { id: "own-place", label: "Local próprio" },
      { id: "video-call", label: "Vídeo chamada" },
    ],
  },
  {
    id: "massage",
    label: "Massagens",
    options: [
      { id: "traditional-massage", label: "Massagem tradicional", legacyLabels: ["Massagem"] },
      { id: "relaxing-massage", label: "Massagem relaxante" },
      { id: "sensual-massage", label: "Massagem sensual" },
      { id: "tantric-massage", label: "Massagem tântrica" },
    ],
  },
  {
    id: "intimate",
    label: "Serviços íntimos",
    options: [
      { id: "kiss", label: "Beijo na boca" },
      { id: "greek-kiss", label: "Beijo grego", directions: ["DO", "RECEIVE", "BOTH"] },
      { id: "protected-oral", label: "Sexo oral com preservativo", directions: ["DO", "RECEIVE", "BOTH"] },
      { id: "unprotected-oral", label: "Sexo oral sem preservativo", directions: ["DO", "RECEIVE", "BOTH"] },
      { id: "protected-vaginal", label: "Sexo vaginal com preservativo" },
      { id: "protected-anal", label: "Sexo anal com preservativo", directions: ["DO", "RECEIVE", "BOTH"] },
      { id: "masturbation", label: "Masturbação", directions: ["DO", "RECEIVE", "BOTH"] },
      { id: "virtual", label: "Sexo virtual", legacyLabels: ["Faz sexo virtual"] },
    ],
  },
] as const;

export const PROFESSIONAL_SPECIALTY_CATEGORIES: readonly ProfessionalServiceCategory[] = [
  {
    id: "behavior",
    label: "Comportamento e especialidades",
    options: [
      { id: "striptease", label: "Striptease" },
      { id: "domination", label: "Dominação" },
      { id: "submission", label: "Submissão" },
      { id: "roleplay", label: "Roleplay" },
      { id: "uniforms", label: "Fantasias/uniformes" },
      { id: "bondage", label: "Bondage" },
      { id: "toys", label: "Acessórios eróticos" },
      { id: "filming", label: "Permite filmagem" },
      { id: "voyeurism", label: "Voyeurismo" },
      { id: "sadomasochism", label: "Sadomasoquismo" },
      { id: "podolatry", label: "Podolatria" },
      { id: "active", label: "Ativo" },
      { id: "passive", label: "Passivo" },
      { id: "versatile", label: "Versátil" },
    ],
  },
] as const;

const DIRECTION_SEPARATOR = " — ";

export function serviceSelectionValue(option: ProfessionalServiceOption, direction?: ServiceDirection) {
  return direction ? `${option.label}${DIRECTION_SEPARATOR}${SERVICE_DIRECTION_LABELS[direction]}` : option.label;
}

export function serviceSelectionDirection(value: string, option: ProfessionalServiceOption): ServiceDirection | null {
  const labels = [option.label, ...(option.legacyLabels ?? [])];
  for (const label of labels) {
    if (value === label) return null;
    const suffix = value.startsWith(`${label}${DIRECTION_SEPARATOR}`)
      ? value.slice(label.length + DIRECTION_SEPARATOR.length)
      : null;
    if (!suffix) continue;
    const match = (Object.entries(SERVICE_DIRECTION_LABELS) as Array<[ServiceDirection, string]>)
      .find(([, directionLabel]) => directionLabel === suffix);
    if (match) return match[0];
  }
  return null;
}

export function isServiceOptionSelected(values: readonly string[], option: ProfessionalServiceOption) {
  const labels = [option.label, ...(option.legacyLabels ?? [])];
  return values.some((value) => labels.some((label) => value === label || value.startsWith(`${label}${DIRECTION_SEPARATOR}`)));
}

export function replaceServiceSelection(
  values: readonly string[],
  option: ProfessionalServiceOption,
  direction?: ServiceDirection,
) {
  const labels = [option.label, ...(option.legacyLabels ?? [])];
  const remaining = values.filter(
    (value) => !labels.some((label) => value === label || value.startsWith(`${label}${DIRECTION_SEPARATOR}`)),
  );
  return [...remaining, serviceSelectionValue(option, direction)];
}

export function removeServiceSelection(values: readonly string[], option: ProfessionalServiceOption) {
  const labels = [option.label, ...(option.legacyLabels ?? [])];
  return values.filter(
    (value) => !labels.some((label) => value === label || value.startsWith(`${label}${DIRECTION_SEPARATOR}`)),
  );
}
