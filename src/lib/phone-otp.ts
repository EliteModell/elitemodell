import crypto from "crypto";

export const PHONE_ACCOUNT_TYPES = ["client", "model", "host"] as const;
export type PhoneAccountType = (typeof PHONE_ACCOUNT_TYPES)[number];
export type OtpDeliveryChannel = "sms" | "whatsapp";

export const OTP_TTL_MINUTES = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_PHONE_PER_HOUR = 5;
export const OTP_MAX_SENDS_PER_IP_PER_HOUR = 20;
export const OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW = 12;
export const OTP_MAX_VERIFY_ATTEMPTS_PER_IP_WINDOW = 40;

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return withoutCountry.slice(0, 11);
}

export function isValidBrazilianMobilePhone(phone: string) {
  return /^[1-9]{2}9\d{8}$/.test(phone);
}

export function formatBrazilianPhone(phone: string) {
  const digits = normalizeBrazilianPhone(phone);
  if (digits.length !== 11) return phone;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function createOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function otpSecret() {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET ou AUTH_SECRET precisa estar configurado para OTP.");
  }
  return secret ?? "elitemodell-local-otp-secret";
}

export function hashOtpCode(phone: string, code: string) {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`${normalizeBrazilianPhone(phone)}:${code}`)
    .digest("hex");
}

export function timingSafeCodeCompare(phone: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashOtpCode(phone, code));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function createPhoneAuthToken(userId: string, phone: string) {
  const expires = Date.now() + 5 * 60 * 1000;
  const payload = `${userId}.${normalizeBrazilianPhone(phone)}.${expires}`;
  const signature = crypto.createHmac("sha256", otpSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyPhoneAuthToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [userId, phone, expiresRaw, signature] = parts;
  const payload = `${userId}.${phone}.${expiresRaw}`;
  const expected = crypto.createHmac("sha256", otpSecret()).update(payload).digest("hex");
  const actual = Buffer.from(signature);
  const safeExpected = Buffer.from(expected);

  if (actual.length !== safeExpected.length || !crypto.timingSafeEqual(actual, safeExpected)) {
    return null;
  }

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  return { userId, phone };
}

export function createPendingProfessionalPhoneToken(phone: string, verificationId: string) {
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const normalizedPhone = normalizeBrazilianPhone(phone);
  const payload = `${normalizedPhone}.${verificationId}.${expires}`;
  const signature = crypto.createHmac("sha256", otpSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyPendingProfessionalPhoneToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [phone, verificationId, expiresRaw, signature] = parts;
  const payload = `${phone}.${verificationId}.${expiresRaw}`;
  const expected = crypto.createHmac("sha256", otpSecret()).update(payload).digest("hex");
  const actual = Buffer.from(signature);
  const safeExpected = Buffer.from(expected);

  if (actual.length !== safeExpected.length || !crypto.timingSafeEqual(actual, safeExpected)) {
    return null;
  }

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  if (!isValidBrazilianMobilePhone(phone) || !verificationId) return null;

  return { phone, verificationId };
}

export function emailForPhone(phone: string, accountType: PhoneAccountType) {
  return `phone_${accountType}_${normalizeBrazilianPhone(phone)}@sms.elitemodell.local`;
}

// Nota de design: o banco usa role "HOST" para profissionais/modelos
// e role "GUEST" para clientes e anfitriões. A separação real é via accountType.
// "HOST" aqui significa "conta não-client" no esquema legado do banco.
export function roleForPhoneAccount(accountType: PhoneAccountType): "HOST" | "GUEST" {
  // model → HOST (necessário para requireCompanionPanel reconhecer)
  // host → GUEST (anfitrião é distinguido via accountType="host", não via role)
  // client → GUEST
  return accountType === "model" ? "HOST" : "GUEST";
}

export function nameForPhoneAccount(accountType: PhoneAccountType) {
  if (accountType === "model") return "Cadastro profissional";
  if (accountType === "host") return "Anfitriao Elite Modell";
  return "Cliente Elite Modell";
}

export function redirectForPhoneAccount(accountType: PhoneAccountType) {
  if (accountType === "model") return "/profissional/novo";
  if (accountType === "host") return "/anfitriao/imoveis/novo";
  return "/painel/cliente";
}
