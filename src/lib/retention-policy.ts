import "server-only";

import { prisma } from "@/lib/prisma";

export const REQUIRED_RETENTION_CATEGORIES = [
  "ACCOUNT",
  "AUTH",
  "KYC",
  "IDENTITY_DOCUMENT",
  "BIOMETRIC_REFERENCE",
  "PUBLIC_MEDIA",
  "PRIVATE_MEDIA",
  "QUARANTINE",
  "MESSAGE",
  "PAYMENT",
  "AUDIT_LOG",
  "ABUSE_REPORT",
  "WEBHOOK",
] as const;

export type RetentionCategory = typeof REQUIRED_RETENTION_CATEGORIES[number];

export async function getRetentionPolicy(category: RetentionCategory) {
  return prisma.dataRetentionRule.findUnique({ where: { category } });
}

export async function requireApprovedRetentionPolicy(category: RetentionCategory) {
  const policy = await getRetentionPolicy(category);
  if (
    !policy ||
    policy.status !== "APPROVED" ||
    !policy.action ||
    !policy.legalBasis ||
    !policy.approvedAt ||
    !policy.approvedById
  ) {
    throw new Error(`Politica de retencao ${category} nao aprovada; exclusao automatica bloqueada.`);
  }
  return policy;
}

export async function retentionFrameworkStatus() {
  const rules = await prisma.dataRetentionRule.findMany({
    where: { category: { in: [...REQUIRED_RETENTION_CATEGORIES] } },
    select: { category: true, status: true, action: true, retentionDays: true, legalBasis: true, approvedAt: true },
  });
  const byCategory = new Map(rules.map((rule) => [rule.category, rule]));
  return REQUIRED_RETENTION_CATEGORIES.map((category) => {
    const rule = byCategory.get(category);
    return {
      category,
      configured: Boolean(rule),
      approved: Boolean(rule?.status === "APPROVED" && rule.action && rule.legalBasis && rule.approvedAt),
      status: rule?.status ?? "MISSING",
      retentionDays: rule?.retentionDays ?? null,
    };
  });
}
