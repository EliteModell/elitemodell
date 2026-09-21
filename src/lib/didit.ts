import { createHmac, timingSafeEqual } from "crypto";

const DIDIT_API_BASE = "https://verification.didit.me";

export const DIDIT_PENDING_STATUS = "PENDING";
export const DIDIT_APPROVED_STATUS = "APPROVED";
export const DIDIT_REJECTED_STATUS = "REJECTED";

const DIDIT_PENDING_STATUSES = new Set<DiditSessionStatus>([
  "Not Started",
  "In Progress",
  "In Review",
  "Resubmitted",
  "Awaiting User",
  "Not Finished",
]);
const DIDIT_REJECTED_STATUSES = new Set<DiditSessionStatus>([
  "Declined",
  "Expired",
  "Abandoned",
  "Kyc Expired",
  "Cancelled",
]);

export type DiditSessionStatus =
  | "Not Started"
  | "In Progress"
  | "Approved"
  | "Declined"
  | "In Review"
  | "Expired"
  | "Abandoned"
  | "Kyc Expired"
  | "Resubmitted"
  | "Awaiting User"
  | "Not Finished"
  | "Cancelled";

export type DiditSession = {
  session_id: string;
  session_token: string;
  url: string;
  status: DiditSessionStatus;
  vendor_data: string | null;
};

export type DiditIdVerification = {
  node_id: string;
  status: string;
  document_type?: string | null;
  date_of_birth?: string | null;
  full_name?: string | null;
  expiration_date?: string | null;
};

export type DiditLivenessCheck = {
  node_id: string;
  status: string;
  score?: number | null;
  age_estimation?: number | null;
};

export type DiditDecision = {
  session_id: string;
  status: DiditSessionStatus;
  vendor_data: string | null;
  id_verifications: DiditIdVerification[] | null;
  liveness_checks: DiditLivenessCheck[] | null;
};

export type DiditWebhookPayload = {
  event_id: string;
  webhook_type: string;
  timestamp: number;
  created_at: number;
  session_id?: string;
  status?: string;
  vendor_data?: string | null;
  environment: "live" | "sandbox";
  decision?: Record<string, unknown> | null;
};

export function digitWebhookAuditPayload(payload: DiditWebhookPayload) {
  return {
    eventId: payload.event_id || null,
    eventType: payload.webhook_type || null,
    sessionId: payload.session_id || null,
    status: payload.status || null,
    timestamp: payload.timestamp || payload.created_at || null,
  };
}

export type DiditVerificationStatus =
  | typeof DIDIT_PENDING_STATUS
  | typeof DIDIT_APPROVED_STATUS
  | typeof DIDIT_REJECTED_STATUS;

export type DiditSessionSummary = Pick<DiditSession, "session_id" | "status" | "vendor_data"> & { url: string | null };

export function normalizeDigitStatus(status?: string | null): DiditVerificationStatus {
  if (status === "Approved") return DIDIT_APPROVED_STATUS;
  if (DIDIT_REJECTED_STATUSES.has(status as DiditSessionStatus)) return DIDIT_REJECTED_STATUS;
  return DIDIT_PENDING_STATUS;
}

export function canRetryDigitStatus(status?: string | null) {
  return DIDIT_REJECTED_STATUSES.has(status as DiditSessionStatus);
}

export function isPendingDigitStatus(status?: string | null) {
  return DIDIT_PENDING_STATUSES.has(status as DiditSessionStatus);
}

export function buildDigitVendorData(userId: string, intentId: string) {
  return `${userId}:didit-intent:${intentId}`;
}

export function digitVendorDataBelongsToUser(vendorData: string | null | undefined, userId: string) {
  return vendorData === userId || Boolean(vendorData?.startsWith(`${userId}:didit-intent:`));
}

export function digitWebhookTargetsActiveSession(input: {
  activeSessionId: string | null | undefined;
  webhookSessionId: string | null | undefined;
  vendorData: string | null | undefined;
  userId: string;
}) {
  return Boolean(
    input.activeSessionId &&
      input.webhookSessionId === input.activeSessionId &&
      digitVendorDataBelongsToUser(input.vendorData, input.userId),
  );
}

export function digitStatusWhenProviderUnavailable() {
  return DIDIT_PENDING_STATUS;
}

export function isSafeDigitVerificationUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "didit.me" || url.hostname.endsWith(".didit.me"));
  } catch {
    return false;
  }
}

const DIGIT_INTENT_PREFIX = "didit:creating:";

export function createDigitIntentMarker(intentId: string, createdAt = Date.now(), leaseAt = createdAt) {
  return `${DIGIT_INTENT_PREFIX}${intentId}:${createdAt}:${leaseAt}`;
}

export function parseDigitIntentMarker(value: string | null | undefined) {
  if (!value?.startsWith(DIGIT_INTENT_PREFIX)) return null;
  const raw = value.slice(DIGIT_INTENT_PREFIX.length);
  const parts = raw.split(":");
  if (parts.length < 2) return null;
  const leaseAt = Number(parts.pop());
  const maybeCreatedAt = parts.length > 1 ? Number(parts.pop()) : leaseAt;
  const intentId = parts.join(":");
  if (!intentId || !Number.isFinite(maybeCreatedAt) || !Number.isFinite(leaseAt)) return null;
  return { intentId, createdAt: maybeCreatedAt, leaseAt };
}

function getDigitConfig() {
  const apiKey = process.env.DIDIT_API_KEY?.trim() ?? "";
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim() ?? "";
  const missing = [!apiKey && "DIDIT_API_KEY", !workflowId && "DIDIT_WORKFLOW_ID"].filter(Boolean) as string[];
  return { apiKey, workflowId, missing };
}

export function isDigitAvailable() {
  return getDigitConfig().missing.length === 0;
}

export async function createDigitSession(vendorData: string, callbackUrl: string): Promise<DiditSession> {
  const { apiKey, workflowId } = getDigitConfig();

  const res = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: vendorData,
      callback: callbackUrl,
      language: "pt",
    }),
  });

  if (!res.ok) {
    throw new Error(`Didit session creation failed with status ${res.status}`);
  }

  return res.json() as Promise<DiditSession>;
}

export async function findDigitSessionByVendorData(vendorData: string): Promise<DiditSessionSummary | null> {
  const { apiKey } = getDigitConfig();
  const url = new URL(`${DIDIT_API_BASE}/v2/sessions`);
  url.searchParams.set("vendor_data", vendorData);

  const res = await fetch(url, { headers: { "x-api-key": apiKey } });
  if (!res.ok) {
    throw new Error(`Didit session reconciliation failed with status ${res.status}`);
  }

  const body = await res.json() as unknown;
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const candidates = Array.isArray(body)
    ? body
    : Array.isArray(record.results)
      ? record.results
      : Array.isArray(record.data)
        ? record.data
        : Array.isArray(record.sessions)
          ? record.sessions
          : [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const session = candidate as Record<string, unknown>;
    const sessionId = typeof session.session_id === "string" ? session.session_id : null;
    const sessionUrl = typeof session.url === "string"
      ? session.url
      : typeof session.verification_url === "string"
        ? session.verification_url
        : null;
    const status = typeof session.status === "string" ? session.status as DiditSessionStatus : "Not Started";
    const owner = typeof session.vendor_data === "string" ? session.vendor_data : vendorData;
    if (sessionId && owner === vendorData) {
      return {
        session_id: sessionId,
        url: isSafeDigitVerificationUrl(sessionUrl) ? sessionUrl : null,
        status,
        vendor_data: owner,
      };
    }
  }

  return null;
}

export async function fetchDigitSessionDecision(sessionId: string): Promise<DiditDecision> {
  const { apiKey } = getDigitConfig();

  const res = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`Didit fetch decision failed with status ${res.status}`);
  }

  return res.json() as Promise<DiditDecision>;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(",")}}`;
}

function hmacSha256Hex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function matchesSignature(computed: string, received?: string | null) {
  if (!received) return false;
  const expected = received.toLowerCase().replace(/^sha256=/, "");
  if (!/^[a-f0-9]+$/.test(expected) || computed.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(expected, "hex"));
}

export function verifyDigitWebhook(input: {
  rawBody: string;
  parsedBody: unknown;
  secret: string;
  signatureV2?: string | null;
  signature?: string | null;
  signatureSimple?: string | null;
}): boolean {
  const { rawBody, parsedBody, secret, signatureV2, signature, signatureSimple } = input;
  if (!secret) return false;

  try {
    const canonicalPayload = canonicalize(parsedBody);
    if (matchesSignature(hmacSha256Hex(secret, canonicalPayload), signatureV2)) return true;
    if (matchesSignature(hmacSha256Hex(secret, rawBody), signature)) return true;
    if (matchesSignature(hmacSha256Hex(secret, rawBody), signatureSimple)) return true;
    return false;
  } catch {
    return false;
  }
}

export function extractDateOfBirth(decision: DiditDecision): string | null {
  const verifications = decision.id_verifications ?? [];
  for (const v of verifications) {
    if (v.date_of_birth) return v.date_of_birth;
  }
  return null;
}

export function isAdult(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}
