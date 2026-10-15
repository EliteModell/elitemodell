import { createHmac, timingSafeEqual } from "node:crypto";

export type EmailVerificationAttempt = {
  v: 1;
  userId: string;
  email: string;
  attemptId: string;
  exp: number;
};

const TTL_SECONDS = 30 * 60;

function secret() {
  const value = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!value) throw new Error("Segredo de autenticacao ausente.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createEmailVerificationAttempt(
  input: Omit<EmailVerificationAttempt, "v" | "exp">,
  ttlSeconds = TTL_SECONDS,
) {
  const payload: EmailVerificationAttempt = {
    ...input,
    v: 1,
    email: input.email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyEmailVerificationAttempt(token?: string | null) {
  if (!token) return null;
  const [encoded, receivedSignature, extra] = token.split(".");
  if (!encoded || !receivedSignature || extra || !safeEqual(receivedSignature, signature(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as EmailVerificationAttempt;
    if (
      payload.v !== 1 ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.attemptId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
