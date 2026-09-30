import municipalities from "@/data/brazilian-cities.json";
import { normalizeLocationText, normalizeBrazilianState } from "@/lib/brazilian-location";

export type CitySuggestion = { id: string; city: string; state: string; label: string; count?: number };
export const cityKey = (city: string, state: string) => `${normalizeLocationText(city)}|${normalizeBrazilianState(state)}`;

export function parseCityQuery(value: string, stateValue = "") {
  const normalized = normalizeLocationText(value).replace(/[,/–—-]+/g, " ").replace(/\s+/g, " ").trim();
  if (municipalities.some((item) => item.state === normalized.toUpperCase())) {
    return { city: "", state: normalizeBrazilianState(stateValue) || normalized.toUpperCase() };
  }
  const suffix = normalized.match(/^(.*?)\s+([a-z]{2})$/);
  const suffixState = suffix && municipalities.some((item) => item.state === suffix[2].toUpperCase()) ? suffix[2].toUpperCase() : "";
  return { city: suffixState ? suffix![1] : normalized, state: normalizeBrazilianState(stateValue) || suffixState };
}

export function suggestCities(input: string, populated: Array<{ city: string; state: string; count: number }> = [], limit = 12): CitySuggestion[] {
  const query = parseCityQuery(input);
  const counts = new Map<string, number>();
  for (const item of populated) {
    const key = cityKey(item.city, item.state);
    counts.set(key, (counts.get(key) ?? 0) + item.count);
  }
  const entries = new Map(municipalities.map((item) => [cityKey(item.city, item.state), item]));
  for (const item of populated) {
    const key = cityKey(item.city, item.state);
    if (!entries.has(key) && item.city && normalizeBrazilianState(item.state)) entries.set(key, { ...item, id: key });
  }
  return [...entries.values()]
    .filter((item) => (!query.state || item.state === query.state) && normalizeLocationText(item.city).includes(query.city))
    .map((item) => ({ ...item, label: `${item.city}, ${item.state}`, count: counts.get(cityKey(item.city, item.state)) ?? 0 }))
    .sort((a, b) => Number(b.count > 0) - Number(a.count > 0)
      || Number(normalizeLocationText(b.city) === query.city) - Number(normalizeLocationText(a.city) === query.city)
      || Number(normalizeLocationText(b.city).startsWith(query.city)) - Number(normalizeLocationText(a.city).startsWith(query.city))
      || b.count - a.count || a.city.localeCompare(b.city, "pt-BR") || a.state.localeCompare(b.state))
    .slice(0, limit);
}
