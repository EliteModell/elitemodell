import "server-only";

import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const MFA_COOKIE = "elitemodell_admin_mfa";
const MFA_SESSION_HOURS = 8;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey() {
  const source = process.env.ADMIN_MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!source) throw new Error("Configure ADMIN_MFA_ENCRYPTION_KEY ou NEXTAUTH_SECRET.");
  return createHash("sha256").update(source).digest();
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptMfaSecret(value: string) {
  const [ivRaw, tagRaw, dataRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error("Segredo MFA invalido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function generateMfaSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32[Number.parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return result;
}

function decodeBase32(value: string) {
  let bits = "";
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Base32 invalido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totpAt(secret: string, timestamp: number) {
  const counter = Math.floor(timestamp / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Math.floor(Date.now() / 1000);
  return [-30, 0, 30].some((offset) => {
    const expected = Buffer.from(totpAt(secret, now + offset));
    const received = Buffer.from(code);
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function mfaOtpAuthUri(email: string, secret: string) {
  const issuer = "Elite Modell Admin";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export async function createAdminMfaSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MFA_SESSION_HOURS * 60 * 60 * 1000);
  await prisma.adminMfaSession.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt, ipAddress, userAgent },
  });
  const store = await cookies();
  store.set(MFA_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function hasValidAdminMfaSession(userId: string) {
  const token = (await cookies()).get(MFA_COOKIE)?.value;
  if (!token) return false;
  const session = await prisma.adminMfaSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
  return Boolean(session && session.userId === userId && !session.revokedAt && session.expiresAt > new Date());
}

export async function clearAdminMfaSession(userId: string) {
  const store = await cookies();
  const token = store.get(MFA_COOKIE)?.value;
  if (token) {
    await prisma.adminMfaSession.updateMany({
      where: { userId, tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(MFA_COOKIE);
}
