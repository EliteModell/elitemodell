const PRODUCTION_ORIGIN = "https://www.elitemodell.com.br";
const ALLOWED_QUERY_KEYS = new Set(["returnUrl", "role", "flow", "intent"]);

function canonicalOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || PRODUCTION_ORIGIN;
  try {
    const url = new URL(configured);
    if (process.env.NODE_ENV === "production" && url.hostname !== "www.elitemodell.com.br") {
      return PRODUCTION_ORIGIN;
    }
    return url.origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

function safeInternalPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function buildEmailAuthCallbackUrl(params: URLSearchParams) {
  const output = new URL("/auth/callback", canonicalOrigin());
  params.forEach((value, key) => {
    if (!ALLOWED_QUERY_KEYS.has(key)) return;
    if (key === "returnUrl" && !safeInternalPath(value)) return;
    output.searchParams.set(key, value);
  });
  return output.toString();
}

export function canonicalizeRequestedEmailCallback(rawUrl: string) {
  const requested = new URL(rawUrl);
  if (requested.pathname !== "/auth/callback") {
    throw new Error("invalid_auth_callback_path");
  }
  return buildEmailAuthCallbackUrl(requested.searchParams);
}
