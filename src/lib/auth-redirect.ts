const FALLBACK_CANONICAL_ORIGIN = "https://www.elitemodell.com.br";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPublicAppOrigin() {
  // OAuth PKCE stores its verifier per browser origin; the callback must use
  // the exact origin that started the Google flow.
  if (typeof window !== "undefined") return trimTrailingSlash(window.location.origin);

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  return FALLBACK_CANONICAL_ORIGIN;
}

export function buildAuthCallbackUrl(params?: URLSearchParams | string) {
  const query = typeof params === "string" ? params : params?.toString();
  return `${getPublicAppOrigin()}/auth/callback${query ? `?${query}` : ""}`;
}
