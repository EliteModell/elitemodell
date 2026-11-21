export const IDENTITY_PARTS = ["back", "front", "portrait"] as const;
export type IdentityPart = (typeof IDENTITY_PARTS)[number];
export const IDENTITY_DOCUMENTS = ["RG", "CIN", "CNH"] as const;
export const IDENTITY_RETENTION_DAYS = 30;

export function brazilDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return [value("year"), value("month"), value("day")].join("-");
}

export function confirmedAdult(birth: string, today = brazilDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
  const date = new Date(birth + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birth) return false;
  const cutoff = String(Number(today.slice(0, 4)) - 18) + today.slice(4);
  return birth >= "1900-01-01" && birth <= cutoff;
}

export function identityParts(backUnavailable: boolean): readonly IdentityPart[] {
  return backUnavailable ? ["front", "portrait"] : IDENTITY_PARTS;
}
