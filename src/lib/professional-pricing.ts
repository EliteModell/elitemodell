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

