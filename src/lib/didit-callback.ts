export type DiditCallbackUser = {
  activeProfileType?: string | null;
  accountType?: string | null;
  isProfessional?: boolean | null;
};

const PROFESSIONAL_RETURN = "/profissional/novo?didit=returned";
const CLIENT_RETURN = "/dashboard/verificacao-idade";

export function resolveDigitCallbackDestination(input: {
  user: DiditCallbackUser | null;
  hasActiveProfessionalDigit: boolean;
  professionalStateValid?: boolean;
}) {
  if (!input.user) {
    const returnTo = input.professionalStateValid ? PROFESSIONAL_RETURN : CLIENT_RETURN;
    return `/login?returnUrl=${encodeURIComponent(returnTo)}`;
  }
  if (input.hasActiveProfessionalDigit) return PROFESSIONAL_RETURN;
  if (input.user.activeProfileType === "CLIENTE") return CLIENT_RETURN;
  if (
    input.user.activeProfileType === "PROFESSIONAL" ||
    (!input.user.activeProfileType &&
      (input.user.accountType === "model" ||
        input.user.accountType === "professional" ||
        input.user.isProfessional))
  ) {
    return PROFESSIONAL_RETURN;
  }
  return CLIENT_RETURN;
}

export function createDigitCallbackState(secret: string, createdAt = Date.now()) {
  if (!secret) throw new Error("didit_callback_secret_missing");
  const payload = `professional.${createdAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyDigitCallbackState(value: string | null | undefined, secret: string, now = Date.now()) {
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "professional") return false;
  const createdAt = Number(parts[1]);
  if (!Number.isFinite(createdAt) || createdAt > now || now - createdAt > 8 * 24 * 60 * 60 * 1000) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = parts[2];
  if (!/^[a-f0-9]{64}$/.test(received) || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}
import { createHmac, timingSafeEqual } from "crypto";
