export const PUBLIC_LOCATION_STORAGE_KEY = "elite_modell_public_location";
export const PUBLIC_LOCATION_EVENT = "elite:public-location-change";

export type PublicLocationPreference = {
  city: string;
  state: string;
  label: string;
};

function normalizePreference(value: Partial<PublicLocationPreference> | null | undefined): PublicLocationPreference | null {
  const city = value?.city?.trim() ?? "";
  const state = value?.state?.trim().toUpperCase() ?? "";
  if (city.length < 2 || !/^[A-Z]{2}$/.test(state)) return null;
  return { city, state, label: value?.label?.trim() || `${city}, ${state}` };
}

export function readPublicLocationPreference(): PublicLocationPreference | null {
  try {
    return normalizePreference(JSON.parse(localStorage.getItem(PUBLIC_LOCATION_STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function savePublicLocationPreference(value: PublicLocationPreference | null) {
  const normalized = normalizePreference(value);
  if (normalized) localStorage.setItem(PUBLIC_LOCATION_STORAGE_KEY, JSON.stringify(normalized));
  else localStorage.removeItem(PUBLIC_LOCATION_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent<PublicLocationPreference | null>(PUBLIC_LOCATION_EVENT, { detail: normalized }));
}
