export type ProfessionalPlanId =
  | "subir"
  | "30min"
  | "super-top"
  | "top"
  | "diamante"
  | "black"
  | "telefone"
  | "ocultar-idade";

export type ProfessionalPlanPriceKey = "30min" | "hora" | "3d" | "7d" | "30d" | "mensal";

export type ProfessionalActivationMode = "agora" | "depois";

export type ProfessionalPlanPrice = {
  key: ProfessionalPlanPriceKey;
  label: string;
  value: number;
  durationMs: number;
};

export type ProfessionalPlan = {
  id: ProfessionalPlanId;
  name: string;
  points: number;
  prices: ProfessionalPlanPrice[];
  benefits: {
    premium?: boolean;
    featured?: boolean;
    boost?: boolean;
    hideAge?: boolean;
    showPhone?: boolean;
  };
};

const minute = 60 * 1000;
const day = 24 * 60 * minute;

export const PROFESSIONAL_PLANS: ProfessionalPlan[] = [
  {
    id: "subir",
    name: "Subir Agora",
    points: 4000,
    prices: [{ key: "hora", label: "1 hora", value: 6.9, durationMs: 60 * minute }],
    benefits: { premium: true, featured: true, boost: true },
  },
  {
    id: "30min",
    name: "30min no Topo",
    points: 4000,
    prices: [{ key: "30min", label: "30 minutos", value: 49.9, durationMs: 30 * minute }],
    benefits: { premium: true, featured: true, boost: true },
  },
  {
    id: "super-top",
    name: "Super Top",
    points: 2000,
    prices: [
      { key: "3d", label: "3 dias", value: 120.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 196.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 567.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 446, durationMs: 30 * day },
    ],
    benefits: { premium: true, featured: true, boost: true, showPhone: true },
  },
  {
    id: "top",
    name: "Top",
    points: 1000,
    prices: [
      { key: "3d", label: "3 dias", value: 66.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 105.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 330.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 259.8, durationMs: 30 * day },
    ],
    benefits: { premium: true, featured: true, showPhone: true },
  },
  {
    id: "diamante",
    name: "Diamante",
    points: 500,
    prices: [
      { key: "3d", label: "3 dias", value: 80.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 114.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 379.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 342, durationMs: 30 * day },
    ],
    benefits: { premium: true, featured: true },
  },
  {
    id: "black",
    name: "Black",
    points: 200,
    prices: [
      { key: "3d", label: "3 dias", value: 34.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 58.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 114.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 103.5, durationMs: 30 * day },
    ],
    benefits: { premium: true, featured: true },
  },
  {
    id: "telefone",
    name: "Telefone na Listagem",
    points: 200,
    prices: [
      { key: "3d", label: "3 dias", value: 23.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 34.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 92.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 83.7, durationMs: 30 * day },
    ],
    benefits: { premium: true, showPhone: true },
  },
  {
    id: "ocultar-idade",
    name: "Ocultar Idade",
    points: 100,
    prices: [
      { key: "3d", label: "3 dias", value: 35.9, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 49.9, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 99.9, durationMs: 30 * day },
      { key: "mensal", label: "Assinatura mensal", value: 90, durationMs: 30 * day },
    ],
    benefits: { premium: true, hideAge: true },
  },
];

export function getProfessionalPlan(planId: string) {
  return PROFESSIONAL_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function getProfessionalPlanPrice(planId: string, priceKey: string) {
  const plan = getProfessionalPlan(planId);
  if (!plan) return null;
  const price = plan.prices.find((item) => item.key === priceKey);
  return price ? { plan, price } : null;
}

export function professionalPlanReference(input: {
  planId: string;
  priceKey: string;
  activationMode: ProfessionalActivationMode;
  userId: string;
}) {
  return `professional-plan:${input.planId}:${input.priceKey}:${input.activationMode}:${input.userId}:${Date.now()}`;
}

export function parseProfessionalPlanReference(reference?: string | null) {
  if (!reference?.startsWith("professional-plan:")) return null;
  const [, planId, priceKey, activationMode, userId] = reference.split(":");
  if (!planId || !priceKey || !userId) return null;
  const mode: ProfessionalActivationMode = activationMode === "depois" ? "depois" : "agora";
  const resolved = getProfessionalPlanPrice(planId, priceKey);
  if (!resolved) return null;
  return { ...resolved, activationMode: mode, userId };
}

export function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}
