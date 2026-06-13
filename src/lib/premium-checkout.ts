import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const PREMIUM_CLAIM_COOKIE = "elite_premium_claim";
export const PREMIUM_CLAIM_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function newPremiumClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPremiumClaimToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPurchaserDocument(document: string) {
  const salt =
    process.env.PREMIUM_DOCUMENT_HASH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!salt && process.env.NODE_ENV === "production") {
    throw new Error("PREMIUM_DOCUMENT_HASH_SECRET nao configurado.");
  }
  return createHash("sha256")
    .update(`${salt || "elite-premium-document-development"}:${document.replace(/\D/g, "")}`)
    .digest("hex");
}

export function premiumClaimCookieValue(intentId: string, token: string) {
  return `${intentId}.${token}`;
}

export function parsePremiumClaimCookie(value?: string | null) {
  if (!value) return null;
  const separator = value.indexOf(".");
  if (separator <= 0) return null;
  const intentId = value.slice(0, separator);
  const token = value.slice(separator + 1);
  if (!intentId || token.length < 32) return null;
  return { intentId, token };
}

export function readPremiumClaim(req: NextRequest) {
  return parsePremiumClaimCookie(req.cookies.get(PREMIUM_CLAIM_COOKIE)?.value);
}

export function premiumClaimMatches(storedHash: string, token: string) {
  const expected = Buffer.from(storedHash, "hex");
  const received = Buffer.from(hashPremiumClaimToken(token), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function normalizePurchaserEmail(email: string) {
  return email.trim().toLowerCase();
}

export function maskedPurchaserEmail(email: string) {
  const [name, domain] = normalizePurchaserEmail(email).split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}
