import "server-only";

import type { Prisma } from "@prisma/client";
import { activeProfessionalAccessWhere, getProfessionalBillingSettings } from "@/lib/professional-access";

export function publicProfessionalWhere(
  now = new Date(),
  billingEnabled = false,
): Prisma.ProfessionalWhereInput {
  return {
    AND: [
      {
        OR: [
          { status: "ACTIVE", OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }] },
          { status: "PAUSED", verified: true, pauseUntil: { lte: now } },
        ],
      },
      activeProfessionalAccessWhere(now, billingEnabled),
    ],
  };
}

export async function getPublicProfessionalWhere(now = new Date()) {
  const settings = await getProfessionalBillingSettings();
  return publicProfessionalWhere(now, settings.billingEnabled);
}
