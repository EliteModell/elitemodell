export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;
}
