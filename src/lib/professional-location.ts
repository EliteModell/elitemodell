export type ServiceLocation = {
  city: string;
  state: string;
  neighborhood?: string | null;
};

export const INITIAL_FREE_CITY_CHANGES = 3;
export const CITY_CHANGE_REQUIRES_VOUCHER = true;

export function normalizeServiceLocation(input: ServiceLocation): ServiceLocation {
  return {
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    neighborhood: input.neighborhood?.trim() || null,
  };
}

export function locationChangeNeedsReview(input: {
  kycApproved: boolean;
  recentChanges: number;
  stateChanged: boolean;
  sensitiveAccountChangeInLast24Hours?: boolean;
}) {
  if (!input.kycApproved) return { review: true, reason: "KYC não aprovado" };
  if (input.sensitiveAccountChangeInLast24Hours) return { review: true, reason: "alteração recente de dados sensíveis" };
  if (input.recentChanges >= 3) return { review: true, reason: "muitas mudanças de cidade em poucas horas" };
  if (input.stateChanged && input.recentChanges >= 2) return { review: true, reason: "mudanças interestaduais frequentes" };
  return { review: false, reason: null };
}

export function publicServiceLocation(input: {
  currentServiceCity?: string | null;
  currentServiceState?: string | null;
  currentServiceNeighborhood?: string | null;
  city: string;
  state: string;
  bairro?: string | null;
}) {
  return {
    city: input.currentServiceCity || input.city,
    state: input.currentServiceState || input.state,
    neighborhood: input.currentServiceNeighborhood || input.bairro || null,
  };
}
