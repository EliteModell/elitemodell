export type ClientPlanId =
  | "client-premium-24h"
  | "client-premium-30d"
  | "client-premium-90d";

export interface ClientPlan {
  id: ClientPlanId;
  label: string;
  /** Preço padrão (retorno). Para 30d é o preço de renovação. */
  price: number;
  /** Preço especial de primeira compra (apenas 30d). */
  firstPurchasePrice?: number;
  /** Duração em milissegundos */
  durationMs: number;
  /** Ex: "24 horas", "30 dias", "90 dias" */
  durationLabel: string;
  /** Destaque/badge exibido no card */
  badge?: string;
  /** Preço por mês formatado para exibição */
  pricePerMonthLabel?: string;
}

export const CLIENT_PLANS: ClientPlan[] = [
  {
    id: "client-premium-24h",
    label: "24 horas",
    price: 4.99,
    durationMs: 24 * 60 * 60 * 1000,
    durationLabel: "24 horas",
  },
  {
    id: "client-premium-30d",
    label: "30 dias",
    price: 39.9,
    firstPurchasePrice: 10.99,
    durationMs: 30 * 24 * 60 * 60 * 1000,
    durationLabel: "30 dias",
    badge: "Mais popular",
  },
  {
    id: "client-premium-90d",
    label: "90 dias",
    price: 79.9,
    durationMs: 90 * 24 * 60 * 60 * 1000,
    durationLabel: "90 dias",
    pricePerMonthLabel: "R$ 26,63/mês",
  },
];

export const CLIENT_PLAN_IDS = CLIENT_PLANS.map((p) => p.id) as [ClientPlanId, ...ClientPlanId[]];

export function getClientPlan(id: ClientPlanId): ClientPlan {
  const plan = CLIENT_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Client plan not found: ${id}`);
  return plan;
}

export function resolveClientPlanPrice(plan: ClientPlan, isFirstPurchase: boolean): number {
  if (isFirstPurchase && plan.firstPurchasePrice !== undefined) {
    return plan.firstPurchasePrice;
  }
  return plan.price;
}

export function premiumUntilFromDuration(durationMs: number): Date {
  return new Date(Date.now() + durationMs);
}
