export function toCents(value: number) {
  if (!Number.isFinite(value)) throw new Error("Valor monetario invalido.");
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCents(value: number) {
  if (!Number.isInteger(value)) throw new Error("Valor em centavos invalido.");
  return value / 100;
}

export function percentageCents(baseCents: number, basisPoints: number) {
  if (!Number.isInteger(baseCents) || !Number.isInteger(basisPoints)) {
    throw new Error("Calculo monetario invalido.");
  }
  return Math.round((baseCents * basisPoints) / 10_000);
}

export function calculateBookingAmounts(input: {
  nights: number;
  pricePerNightCents: number;
  cleaningFeeCents: number;
  discountCents: number;
  serviceFeeBasisPoints?: number;
}) {
  const subtotalCents = input.nights * input.pricePerNightCents;
  const discountCents = Math.min(Math.max(input.discountCents, 0), subtotalCents);
  const totalPriceCents = Math.max(0, subtotalCents + input.cleaningFeeCents - discountCents);
  const serviceFeeBasisPoints = input.serviceFeeBasisPoints ?? 1_000;
  if (!Number.isInteger(serviceFeeBasisPoints) || serviceFeeBasisPoints < 0 || serviceFeeBasisPoints > 10_000) {
    throw new Error("Percentual da taxa de servico invalido.");
  }
  const serviceFeeCents = percentageCents(totalPriceCents, serviceFeeBasisPoints);
  return {
    subtotalCents,
    cleaningFeeCents: input.cleaningFeeCents,
    discountCents,
    totalPriceCents,
    serviceFeeCents,
    hostPayoutCents: totalPriceCents - serviceFeeCents,
  };
}
