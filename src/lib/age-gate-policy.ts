export const AGE_RESTRICTED_PATH_PREFIXES = [
  "/buscar",
  "/profissionais",
  "/imoveis",
  "/api/media",
  "/api/professionals",
  "/api/properties",
  "/api/reviews",
  "/api/stories",
] as const;

export const AGE_GATE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "Referrer-Policy": "no-referrer",
};

export function isAgeRestrictedPath(pathname: string) {
  return AGE_RESTRICTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function ageGateCacheHeaders() {
  return { ...AGE_GATE_CACHE_HEADERS };
}

export function hasPublicStoragePath(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.includes("/storage/v1/object/public/");
  } catch {
    return value.includes("/storage/v1/object/public/");
  }
}

export function stripLegacyPublicStorageUrl<T extends string | null | undefined>(value: T): T | null {
  if (!value || typeof value !== "string") return value ?? null;
  return hasPublicStoragePath(value) ? null : value;
}
