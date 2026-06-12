import "server-only";

import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canCollectLegalAcceptance,
  PUBLIC_LEGAL_STATUSES,
} from "@/lib/legal-document-catalog";

type DbClient = typeof prisma | Prisma.TransactionClient;
type LegalDocumentVersionWithDocument = Prisma.LegalDocumentVersionGetPayload<{
  include: { document: true };
}>;

type RequestMetadata = {
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  route: string | null;
};

type RequestLike = {
  url?: string;
  headers: Headers;
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
};

export const REGISTRATION_LEGAL_KEYS = [
  "terms-general",
  "privacy-policy",
  "adult-declaration",
  "registration-short-notice",
] as const;

export const CLIENT_REGISTRATION_LEGAL_KEYS = [
  ...REGISTRATION_LEGAL_KEYS,
  "terms-clients",
] as const;

export const PROFESSIONAL_REGISTRATION_LEGAL_KEYS = [
  ...REGISTRATION_LEGAL_KEYS,
  "terms-professionals",
  "adult-safety-policy",
] as const;

export const HOST_REGISTRATION_LEGAL_KEYS = [
  ...REGISTRATION_LEGAL_KEYS,
  "terms-hosts",
  "adult-safety-policy",
] as const;

export const KYC_LEGAL_KEYS = [
  "identity-biometric-policy",
  "biometric-notice",
  "document-upload-notice",
] as const;

export const PUBLICATION_LEGAL_KEYS = [
  "content-policy",
  "content-publication-notice",
  "content-authorization-declaration",
] as const;

export const CHECKOUT_LEGAL_KEYS = [
  "checkout-notice",
  "payments-policy",
  "refund-policy",
] as const;

export const PROFESSIONAL_CHECKOUT_LEGAL_KEYS = [
  "boost-terms",
  "payments-policy",
  "refund-policy",
] as const;

export const ROULETTE_PROMOTION_LEGAL_KEYS = [
  "roleta-promocional-policy",
] as const;

function requestMetadata(req?: RequestLike): RequestMetadata {
  const forwardedFor = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const sessionCookie =
    req?.cookies?.get("next-auth.session-token")?.value ??
    req?.cookies?.get("__Secure-next-auth.session-token")?.value ??
    null;
  return {
    ipAddress: forwardedFor || req?.headers.get("x-real-ip") || null,
    userAgent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
    sessionId: sessionCookie
      ? createHash("sha256").update(sessionCookie).digest("hex")
      : req?.headers.get("x-session-id")?.slice(0, 120) ?? null,
    route: req?.url ? new URL(req.url).pathname : null,
  };
}

function uniqueKeys(keys: readonly string[]) {
  return Array.from(new Set(keys.filter(Boolean)));
}

function normalizeUserCategory(value?: string | null) {
  const normalized = (value ?? "client").toLowerCase();
  if (["model", "professional", "profissional"].includes(normalized)) return "PROFESSIONAL";
  if (["host", "property_host", "anfitriao"].includes(normalized)) return "HOST";
  if (normalized === "admin") return "ADMIN";
  return "CLIENT";
}

export function registrationDocumentKeys(accountType?: string | null) {
  const normalized = normalizeUserCategory(accountType);
  if (normalized === "PROFESSIONAL") return PROFESSIONAL_REGISTRATION_LEGAL_KEYS;
  if (normalized === "HOST") return HOST_REGISTRATION_LEGAL_KEYS;
  return CLIENT_REGISTRATION_LEGAL_KEYS;
}

export async function latestLegalDocumentVersions(
  keys: readonly string[],
  tx: DbClient = prisma,
  language = "pt-BR",
) {
  const wanted = uniqueKeys(keys);
  if (wanted.length === 0) return new Map<string, LegalDocumentVersionWithDocument>();
  const now = new Date();

  const versions = await tx.legalDocumentVersion.findMany({
    where: {
      language,
      status: { in: [...PUBLIC_LEGAL_STATUSES] },
      publishedAt: { not: null },
      effectiveAt: { lte: now },
      document: {
        key: { in: wanted },
        internal: false,
      },
    },
    include: { document: true },
    orderBy: { createdAt: "desc" },
  });

  const byKey = new Map<string, LegalDocumentVersionWithDocument>();
  for (const version of versions) {
    if (
      !byKey.has(version.document.key) &&
      canCollectLegalAcceptance(
        {
          status: version.status,
          internal: version.document.internal,
          effectiveAt: version.effectiveAt,
          publishedAt: version.publishedAt,
        },
        now,
      )
    ) {
      byKey.set(version.document.key, version);
    }
  }
  return byKey;
}

export async function recordUserAcceptances(input: {
  tx?: DbClient;
  userId: string;
  documentKeys: readonly string[];
  userCategory?: string | null;
  source: string;
  req?: RequestLike;
  route?: string | null;
  language?: string;
  action?: string;
  acceptanceType?: string;
  required?: boolean;
  throwOnError?: boolean;
}) {
  const tx = input.tx ?? prisma;
  const metadata = requestMetadata(input.req);
  const route = input.route ?? metadata.route;
  const language = input.language ?? "pt-BR";
  const keys = uniqueKeys(input.documentKeys);

  if (!input.userId || keys.length === 0) {
    return { recorded: 0, missing: keys };
  }

  try {
    const versions = await latestLegalDocumentVersions(keys, tx, language);
    const missing = keys.filter((key) => !versions.has(key));
    if (input.throwOnError && missing.length > 0) {
      throw new Error(
        `Versoes juridicas vigentes ausentes: ${missing.join(", ")}`,
      );
    }
    const records = Array.from(versions.values()).map((version) =>
      tx.userAcceptance.create({
        data: {
          userId: input.userId,
          versionId: version.id,
          userCategory: normalizeUserCategory(input.userCategory),
          documentType: version.document.type,
          versionNumber: version.version,
          versionHash: version.contentHash,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          sessionId: metadata.sessionId,
          source: input.source,
          route,
          language,
          action: input.action ?? "ACCEPTED",
          acceptanceType: input.acceptanceType ?? "DOCUMENT",
          required: input.required ?? true,
        },
        select: { id: true },
      }),
    );
    await Promise.all(records);
    return { recorded: records.length, missing };
  } catch (error) {
    console.error("[legal-acceptance] failed to record acceptances", {
      userId: input.userId,
      source: input.source,
      keys,
      error,
    });
    if (input.throwOnError) throw error;
    return { recorded: 0, missing: keys, failed: true };
  }
}

export async function recordConsentPreference(input: {
  tx?: DbClient;
  userId: string;
  purpose: string;
  granted: boolean;
  source: string;
  req?: RequestLike;
  version?: string | null;
  legalBasis?: string | null;
}) {
  const tx = input.tx ?? prisma;
  const metadata = requestMetadata(input.req);
  const now = new Date();

  try {
    await tx.consentPreference.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        granted: input.granted,
        source: input.source,
        legalBasis: input.legalBasis ?? "CONSENT",
        version: input.version ?? null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        grantedAt: input.granted ? now : null,
        revokedAt: input.granted ? null : now,
      },
      select: { id: true },
    });
    return { recorded: true };
  } catch (error) {
    console.error("[legal-acceptance] failed to record consent preference", {
      userId: input.userId,
      purpose: input.purpose,
      source: input.source,
      error,
    });
    return { recorded: false, failed: true };
  }
}
