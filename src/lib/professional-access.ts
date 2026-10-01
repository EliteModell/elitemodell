import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AccessProfessional } from "@/lib/professional-access-policy";
import { professionalApprovalTrialData } from "@/lib/professional-access-policy";
export {
  resolveProfessionalAccess,
  type ProfessionalAccessState,
} from "@/lib/professional-access-policy";

export const DEFAULT_PROFESSIONAL_FREE_TRIAL_DAYS = 30;
export const PROFESSIONAL_BILLING_SETTINGS_CACHE_TAG = "professional-billing-settings";
export const DEFAULT_PROFESSIONAL_BILLING_SETTINGS = {
  billingEnabled: false,
  monthlyPriceCents: null as number | null,
  currency: "BRL",
  trialDays: DEFAULT_PROFESSIONAL_FREE_TRIAL_DAYS,
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getProfessionalFreeTrialDays(db: DbClient = prisma) {
  const settings = await db.platformSettings.findUnique({
    where: { id: "default" },
    select: { professionalFreeTrialDays: true },
  });
  return settings?.professionalFreeTrialDays ?? DEFAULT_PROFESSIONAL_FREE_TRIAL_DAYS;
}

async function readProfessionalBillingSettings(db: DbClient) {
  const settings = await db.platformSettings.findUnique({
    where: { id: "default" },
    select: {
      professionalBillingEnabled: true,
      professionalMonthlyPriceCents: true,
      professionalBillingCurrency: true,
      professionalFreeTrialDays: true,
    },
  });
  if (!settings) return DEFAULT_PROFESSIONAL_BILLING_SETTINGS;
  return {
    billingEnabled: settings.professionalBillingEnabled,
    monthlyPriceCents: settings.professionalMonthlyPriceCents,
    currency: settings.professionalBillingCurrency,
    trialDays: settings.professionalFreeTrialDays,
  };
}

const getCachedProfessionalBillingSettings = unstable_cache(
  () => readProfessionalBillingSettings(prisma),
  [PROFESSIONAL_BILLING_SETTINGS_CACHE_TAG],
  { revalidate: 60, tags: [PROFESSIONAL_BILLING_SETTINGS_CACHE_TAG] },
);

export async function getProfessionalBillingSettings(db: DbClient = prisma) {
  // Transaction clients must observe their own snapshot and cannot use a shared cache.
  return db === prisma
    ? getCachedProfessionalBillingSettings()
    : readProfessionalBillingSettings(db);
}

export async function professionalApprovalAccessData(
  db: DbClient,
  professional: AccessProfessional,
  now = new Date(),
) {
  const days = await getProfessionalFreeTrialDays(db);
  return professionalApprovalTrialData(professional, days, now);
}

export function activeProfessionalAccessWhere(
  now = new Date(),
  billingEnabled = false,
): Prisma.ProfessionalWhereInput {
  if (!billingEnabled) return {};
  return {
    OR: [
      { accessGrandfathered: true },
      { freeAccessEndsAt: { gt: now } },
      {
        billingStatus: "ACTIVE",
        OR: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { gt: now } }],
      },
      { user: { premiumUntil: { gt: now } } },
    ],
  };
}
