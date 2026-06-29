import { createHmac, timingSafeEqual } from "crypto";

const DIDIT_API_BASE = "https://verification.didit.me";

export const DIDIT_PENDING_STATUS = "PENDING";
export const DIDIT_APPROVED_STATUS = "APPROVED";
export const DIDIT_REJECTED_STATUS = "REJECTED";

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
  | "Awaiting User";

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

function getDigitConfig() {
  const apiKey = process.env.DIDIT_API_KEY?.trim() ?? "";
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim() ?? "";
  const missing = [!apiKey && "DIDIT_API_KEY", !workflowId && "DIDIT_WORKFLOW_ID"].filter(Boolean) as string[];
  return { apiKey, workflowId, missing };
}

export function isDigitAvailable() {
  return getDigitConfig().missing.length === 0;
}

export async function createDigitSession(userId: string, callbackUrl: string): Promise<DiditSession> {
  const { apiKey, workflowId } = getDigitConfig();

  const res = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: userId,
      callback: callbackUrl,
      language: "pt",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Didit session creation failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<DiditSession>;
}

export async function fetchDigitSessionDecision(sessionId: string): Promise<DiditDecision> {
  const { apiKey } = getDigitConfig();

  const res = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Didit fetch decision failed: ${res.status} ${body}`);
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