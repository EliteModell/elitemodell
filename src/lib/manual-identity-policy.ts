export const IDENTITY_PARTS = ["back", "front", "portrait"] as const;
export type IdentityPart = (typeof IDENTITY_PARTS)[number];
export const IDENTITY_DOCUMENTS = ["RG", "CIN", "CNH"] as const;
export const MAX_IDENTITY_IMAGE = 1_250_000;
export const IDENTITY_NOTICE_VERSION = "manual-identity-v1";
export const IDENTITY_RETENTION_DAYS = 30;

export const MANUAL_IDENTITY_BUCKET = "documentos";
export const MANUAL_IDENTITY_PREFIX = "manual-identity-v1";

export function isManualIdentityStorageObject(bucket: string | null, path: string | null) {
  return bucket === MANUAL_IDENTITY_BUCKET && Boolean(path &&
    (path === MANUAL_IDENTITY_PREFIX || path.startsWith(MANUAL_IDENTITY_PREFIX + "/")));
}

export function manualIdentityObjectPath(id: string, part: IdentityPart) {
  if (!/^[a-f0-9]{64}$/.test(id) || !IDENTITY_PARTS.includes(part)) throw new Error("Identificador de evidência inválido.");
  return MANUAL_IDENTITY_PREFIX + "/" + id + "/" + part + ".jpg";
}

export const MANUAL_DOCUMENT_PROVIDER = "MANUAL_DOCUMENT";

export function shouldReviewRegistrationManually(profile: { kycProvider?: string | null; kycSessionId?: string | null; verificationUrl?: string | null; kycStatus?: string | null; verified?: boolean } | null, userSessionId?: string | null) {
  if (profile?.kycProvider === MANUAL_DOCUMENT_PROVIDER) return true;
  return identityEnabled() && !profile?.verified && profile?.kycStatus !== "APPROVED" &&
    !profile?.kycSessionId && !userSessionId;
}

export function manualRegistrationStatus(attempt: { status: string; submittedAt: Date | null; purgeAfter: Date; purgedAt: Date | null; reviewedAt: Date | null; reviewerId: string | null } | null, now = new Date()) {
  if (!attempt?.submittedAt) return "NOT_STARTED";
  if (attempt.status === "APPROVED" && attempt.reviewedAt && attempt.reviewerId) return "APPROVED";
  if (attempt.status === "PENDING_REVIEW" && !attempt.purgedAt && attempt.purgeAfter > now) return "PENDING";
  return "REJECTED";
}

export function manualAttemptAllowsPublication(sessionId: string | null, current: (NonNullable<Parameters<typeof manualRegistrationStatus>[0]> & { id: string }) | null) {
  return Boolean(sessionId && current?.id === sessionId && manualRegistrationStatus(current) === "APPROVED");
}

export function manualIdentitySelected() {
  return process.env.VERCEL_ENV === "production" || identityEnabled();
}

export function identityEnabled() {
  if (process.env.NODE_ENV === "production") {
    return process.env.VERCEL_ENV === "production" && process.env.VERCEL_GIT_COMMIT_REF === "main" &&
      identityTargetsProduction(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.DATABASE_URL, process.env.DIRECT_URL);
  }
  return process.env.NODE_ENV === "development" && process.env.MANUAL_IDENTITY_LOCAL === "1" &&
    process.env.MANUAL_IDENTITY_DEMO !== "1" && identityTargetsAreIsolated(
      process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.DATABASE_URL, process.env.DIRECT_URL,
    );
}

export function identityTargetsProduction(storage?: string, database?: string, direct?: string) {
  return identityTargetsMatchProject("jgvmpbrsxegwkrgjncsv", storage, database, direct);
}

function identityTargetsMatchProject(ref: string, storage?: string, database?: string, direct?: string) {
  if (!storage || !database || !direct) return false;
  try {
    const storageUrl = new URL(storage);
    if (storageUrl.origin !== "https://" + ref + ".supabase.co") return false;
    return [new URL(database), new URL(direct)].every((url) => /^postgres(ql)?:$/.test(url.protocol) &&
      (url.hostname === "db." + ref + ".supabase.co" ||
        (url.hostname.endsWith(".pooler.supabase.com") && url.username === "postgres." + ref)));
  } catch {
    return false;
  }
}

export function identityTargetsAreIsolated(storage?: string, database?: string, direct?: string) {
  if (!storage || !database || !direct) return false;
  try {
    const storageUrl = new URL(storage);
    const targets = [new URL(database), new URL(direct)];
    const loopback = (url: URL) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!/^https?:$/.test(storageUrl.protocol) || !targets.every((url) => /^postgres(ql)?:$/.test(url.protocol))) return false;
    if (loopback(storageUrl)) return targets.every(loopback);
    return identityTargetsMatchProject("jbdshpbtqspzfzjngqbg", storage, database, direct);
  } catch {
    return false;
  }
}

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


export function sameIdentityOrigin(req: Request) {
  return req.headers.get("origin") === new URL(req.url).origin &&
    req.headers.get("sec-fetch-site") !== "cross-site";
}
