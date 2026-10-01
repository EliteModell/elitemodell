import { createHmac, timingSafeEqual } from "node:crypto";

type MediaAccessPayload = {
  assetId: string;
  subject: string;
  expiresAt: number;
};

function signingKey(secret?: string) {
  const value = secret ?? process.env.MEDIA_SIGNING_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("Configure MEDIA_SIGNING_SECRET ou NEXTAUTH_SECRET.");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createMediaAccessToken(
  assetId: string,
  subject: string,
  ttlSeconds = 60,
  now = Date.now(),
  secret?: string,
) {
  if (!assetId || !subject || ttlSeconds < 1 || ttlSeconds > 900) {
    throw new Error("Parametros de token de midia invalidos.");
  }
  const payload: MediaAccessPayload = {
    assetId,
    subject,
    expiresAt: Math.floor(now / 1000) + ttlSeconds,
  };
  const encoded = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", signingKey(secret)).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyMediaAccessToken(
  token: string,
  expectedAssetId: string,
  now = Date.now(),
  secret?: string,
) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = createHmac("sha256", signingKey(secret)).update(encoded).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MediaAccessPayload;
    if (
      payload.assetId !== expectedAssetId ||
      !payload.subject ||
      !Number.isInteger(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
