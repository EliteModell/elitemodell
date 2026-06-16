import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type SignupDraftAccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
export type SignupDraftCategory = "MULHER" | "HOMEM" | "TRANS";

export type SignupDraftTokenPayload = {
  v: 1;
  email: string;
  name: string;
  accountType: SignupDraftAccountType;
  category?: SignupDraftCategory;
  birthDate: string;
  lgpdConsent: boolean;
  termsConsent: boolean;
  ageConfirmed: boolean;
  nonce: string;
  iat: number;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 15 * 60;
const ACCOUNT_TYPES = new Set(["GUEST", "PROFESSIONAL", "PROPERTY_HOST"]);
const CATEGORIES = new Set(["MULHER", "HOMEM", "TRANS"]);

function signingSecret() {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET ausente para sessao de cadastro.");
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isValidPayload(value: unknown): value is SignupDraftTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as SignupDraftTokenPayload;
  return payload.v === 1 &&
    typeof payload.email === "string" &&
    typeof payload.name === "string" &&
    typeof payload.birthDate === "string" &&
    typeof payload.nonce === "string" &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number" &&
    typeof payload.lgpdConsent === "boolean" &&
    typeof payload.termsConsent === "boolean" &&
    typeof payload.ageConfirmed === "boolean" &&
    ACCOUNT_TYPES.has(payload.accountType) &&
    (!payload.category || CATEGORIES.has(payload.category));
}

export function createSignupDraftToken(
  input: Omit<SignupDraftTokenPayload, "v" | "nonce" | "iat" | "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SignupDraftTokenPayload = {
    ...input,
    v: 1,
    email: input.email.trim().toLowerCase(),
    nonce: randomBytes(16).toString("base64url"),
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySignupDraftToken(token?: string | null) {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;
  if (!safeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
    if (!isValidPayload(payload)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
