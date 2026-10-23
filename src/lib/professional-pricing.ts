export type ProfessionalPrices = {
  price15min?: number | null;
  price30min?: number | null;
  pricePerHour?: number | null;
  price2h?: number | null;
  priceOvernight?: number | null;
  priceWebcam?: number | null;
  priceMin?: number | null;
};

export const PROFESSIONAL_PRICE_OPTIONS = [
  { key: "price15min", label: "15 minutos", shortLabel: "15 min" },
  { key: "price30min", label: "30 minutos", shortLabel: "30 min" },
  { key: "pricePerHour", label: "1 hora", shortLabel: "1 h" },
  { key: "price2h", label: "2 horas", shortLabel: "2 h" },
  { key: "priceOvernight", label: "Pernoite", shortLabel: "pernoite" },
  { key: "priceWebcam", label: "Vídeo chamada", shortLabel: "vídeo" },
] as const;

export function professionalPriceOptions(prices: ProfessionalPrices) {
  return PROFESSIONAL_PRICE_OPTIONS.flatMap((option) => {
    const value = prices[option.key];
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? [{ ...option, value }]
      : [];
  });
}

export function professionalStartingPrice(prices: ProfessionalPrices) {
  const options = professionalPriceOptions(prices);
  if (options.length) return options.reduce((lowest, option) => option.value < lowest.value ? option : lowest);
  return typeof prices.priceMin === "number" && prices.priceMin > 0
    ? { key: "priceMin" as const, label: "Valor inicial", shortLabel: "consulte a duração", value: prices.priceMin }
    : null;
}

export function professionalPriceValues(prices: ProfessionalPrices) {
  return professionalPriceOptions(prices).map((option) => option.value);
}

export function professionalDerivedPriceRange(prices: ProfessionalPrices) {
  const values = professionalPriceValues(prices);
  return values.length
    ? { priceMin: Math.min(...values), priceMax: Math.max(...values) }
    : { priceMin: null, priceMax: null };
}

export function compareProfessionalStartingPrice(
  left: ProfessionalPrices,
  right: ProfessionalPrices,
  direction: "asc" | "desc",
) {
  const leftValue = professionalStartingPrice(left)?.value ?? null;
  const rightValue = professionalStartingPrice(right)?.value ?? null;
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

export function professionalPriceForDuration(prices: ProfessionalPrices, durationMinutes: number) {
  const key = ({ 15: "price15min", 30: "price30min", 60: "pricePerHour", 120: "price2h" } as const)[durationMinutes as 15 | 30 | 60 | 120];
  if (!key) return null;
  return professionalPriceOptions(prices).find((option) => option.key === key) ?? null;
}

export function professionalAppointmentPrices(prices: ProfessionalPrices) {
  return [15, 30, 60, 120]
    .map((duration) => ({ duration, price: professionalPriceForDuration(prices, duration) }))
    .filter((item): item is { duration: number; price: NonNullable<ReturnType<typeof professionalPriceForDuration>> } => Boolean(item.price));
}

export function formatProfessionalPrice(prices: ProfessionalPrices, prefix = "A partir de") {
  const startingPrice = professionalStartingPrice(prices);
  if (!startingPrice) return "Consultar";
  return `${prefix} R$ ${startingPrice.value.toLocaleString("pt-BR")} · ${startingPrice.shortLabel}`;
}

