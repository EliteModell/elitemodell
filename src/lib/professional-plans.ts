export type ProfessionalPlanId =
  | "one-hour-top"
  | "pontos"
  | "telefone"
  | "bronze"
  | "prata"
  | "ouro"
  | "diamante"
  | "idade-oculta";

export type ProfessionalPlanPriceKey = "hora" | "3d" | "7d" | "30d" | "mensal";

export type ProfessionalActivationMode = "agora" | "depois";

export type ProfessionalPlanPrice = {
  key: ProfessionalPlanPriceKey;
  label: string;
  value: number;
  durationMs: number;
  dailyLabel?: string;
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

export const POINTS_MIN = 10;
export const POINTS_MAX = 15000;

export const PROFESSIONAL_PLANS: ProfessionalPlan[] = [
  {
    id: "one-hour-top",
    name: "1 hora no topo",
    points: 0,
    prices: [{ key: "hora", label: "1 hora", value: 24.99, durationMs: 60 * minute }],
    benefits: { premium: true, featured: true, boost: true, showPhone: true },
  },
  {
    id: "pontos",
    name: "Pontos",
    points: POINTS_MIN,
    prices: [
      { key: "30d", label: "30 dias", value: 9.99, durationMs: 30 * day },
      { key: "7d", label: "7 dias", value: 1.5, durationMs: 7 * day },
      { key: "3d", label: "3 dias", value: 0.9, durationMs: 3 * day },
    ],
    benefits: { premium: true, boost: true },
  },
  {
    id: "telefone",
    name: "Telefone na listagem",
    points: 0,
    prices: [
      { key: "3d", label: "3 dias", value: 9.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 19.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 59.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 59.7, durationMs: 30 * day, dailyLabel: "R$ 1,99/dia" },
    ],
    benefits: { premium: true, showPhone: true },
  },
  {
    id: "bronze",
    name: "Bronze",
    points: 200,
    prices: [
      { key: "3d", label: "3 dias", value: 19.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 39.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 79.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 79.9, durationMs: 30 * day, dailyLabel: "R$ 2,66/dia" },
    ],
    benefits: { premium: true, featured: true },
  },
  {
    id: "prata",
    name: "Prata",
    points: 500,
    prices: [
      { key: "3d", label: "3 dias", value: 29.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 59.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 109.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 109.8, durationMs: 30 * day, dailyLabel: "R$ 3,66/dia" },
    ],
    benefits: { premium: true, featured: true },
  },
  {
    id: "ouro",
    name: "Ouro",
    points: 1000,
    prices: [
      { key: "3d", label: "3 dias", value: 39.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 79.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 209.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 209.7, durationMs: 30 * day, dailyLabel: "R$ 6,99/dia" },
    ],
    benefits: { premium: true, featured: true, showPhone: true },
  },
  {
    id: "diamante",
    name: "Diamante",
    points: 2000,
    prices: [
      { key: "3d", label: "3 dias", value: 69.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 109.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 339.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 339.9, durationMs: 30 * day, dailyLabel: "R$ 11,33/dia" },
    ],
    benefits: { premium: true, featured: true, showPhone: true },
  },
  {
    id: "idade-oculta",
    name: "Idade oculta",
    points: 100,
    prices: [
      { key: "3d", label: "3 dias", value: 19.99, durationMs: 3 * day },
      { key: "7d", label: "7 dias", value: 29.99, durationMs: 7 * day },
      { key: "30d", label: "30 dias", value: 59.99, durationMs: 30 * day },
      { key: "mensal", label: "30 dias - pagamento único", value: 59.7, durationMs: 30 * day, dailyLabel: "R$ 1,99/dia" },
    ],
    benefits: { premium: true, hideAge: true },
  },
];

export function normalizePointsQuantity(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return POINTS_MIN;
  return Math.min(POINTS_MAX, Math.max(POINTS_MIN, Math.round(numberValue)));
}

export function getProfessionalPlan(planId: string) {
  return PROFESSIONAL_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function getProfessionalPlanPriority(planId: string) {
  return {
    diamante: 600,
    ouro: 500,
    prata: 400,
    bronze: 300,
    "one-hour-top": 700,
    pontos: 200,
    telefone: 100,
    "idade-oculta": 100,
  }[planId] ?? 0;
}

export function getProfessionalPlanPrice(planId: string, priceKey: string, pointsQuantity?: unknown) {
  const plan = getProfessionalPlan(planId);
  if (!plan) return null;
  const price = plan.prices.find((item) => item.key === priceKey);
  if (!price) return null;

  if (plan.id !== "pontos") return { plan, price };

  const quantity = normalizePointsQuantity(pointsQuantity);
  const multiplier = quantity / POINTS_MIN;
  return {
    plan: { ...plan, points: quantity },
    price: { ...price, value: Number((price.value * multiplier).toFixed(2)) },
  };
}

export function professionalPlanReference(input: {
  planId: string;
  priceKey: string;
  activationMode: ProfessionalActivationMode;
  userId: string;
  pointsQuantity?: number;
  checkoutToken?: string;
}) {
  const quantity = input.pointsQuantity ? `:${normalizePointsQuantity(input.pointsQuantity)}` : "";
  return `professional-plan:${input.planId}:${input.priceKey}:${input.activationMode}:${input.userId}:${input.checkoutToken ?? Date.now()}${quantity}`;
}

export function parseProfessionalPlanReference(reference?: string | null) {
  if (!reference?.startsWith("professional-plan:")) return null;
  const [, planId, priceKey, activationMode, userId, , pointsQuantity] = reference.split(":");
  if (!planId || !priceKey || !userId) return null;
  const mode: ProfessionalActivationMode = activationMode === "depois" ? "depois" : "agora";
  const resolved = getProfessionalPlanPrice(planId, priceKey, pointsQuantity);
  if (!resolved) return null;
  return { ...resolved, activationMode: mode, userId };
}

export function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}
