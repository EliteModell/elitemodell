import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AccessProfessional } from "@/lib/professional-access-policy";
export {
  resolveProfessionalAccess,
  type ProfessionalAccessState,
} from "@/lib/professional-access-policy";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_PROFESSIONAL_FREE_TRIAL_DAYS = 30;

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getProfessionalFreeTrialDays(db: DbClient = prisma) {
  const settings = await db.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default", professionalFreeTrialDays: DEFAULT_PROFESSIONAL_FREE_TRIAL_DAYS },
    update: {},
    select: { professionalFreeTrialDays: true },
  });
  return settings.professionalFreeTrialDays;
}

export async function professionalApprovalAccessData(
  db: DbClient,
  professional: AccessProfessional,
  now = new Date(),
) {
  if (professional.accessGrandfathered || professional.freeAccessStartedAt || professional.freeAccessEndsAt) {
    return {};
  }

  const days = await getProfessionalFreeTrialDays(db);
  return {
    freeAccessStartedAt: now,
    freeAccessEndsAt: new Date(now.getTime() + days * DAY_MS),
  };
}

export function activeProfessionalAccessWhere(now = new Date()): Prisma.ProfessionalWhereInput {
  return {
    OR: [
      { accessGrandfathered: true },
      { freeAccessEndsAt: { gt: now } },
      { user: { premiumUntil: { gt: now } } },
    ],
  };
}
