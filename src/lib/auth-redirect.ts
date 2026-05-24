const FALLBACK_CANONICAL_ORIGIN = "https://www.elitemodell.com.br";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPublicAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  if (typeof window === "undefined") return FALLBACK_CANONICAL_ORIGIN;

  if (window.location.hostname === "elitemodell.com.br") {
    return FALLBACK_CANONICAL_ORIGIN;
  }

  return window.location.origin;
}

export function buildAuthCallbackUrl(params?: URLSearchParams | string) {
  const query = typeof params === "string" ? params : params?.toString();
  return `${getPublicAppOrigin()}/auth/callback${query ? `?${query}` : ""}`;
}
