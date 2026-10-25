import "server-only";

import type { Prisma } from "@prisma/client";
import { activeProfessionalAccessWhere, getProfessionalBillingSettings } from "@/lib/professional-access";
import { RESERVED_PUBLIC_PROFESSIONAL_NAMES } from "@/lib/professional-display-name";

export function publicProfessionalWhere(
  now = new Date(),
  billingEnabled = false,
): Prisma.ProfessionalWhereInput {
  return {
    AND: [
      {
        verified: true,
        kycStatus: "APPROVED",
        user: { blocked: false },
      },
      {
        OR: [
          { status: "ACTIVE", OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }] },
          { status: "PAUSED", verified: true, pauseUntil: { lte: now } },
        ],
      },
      activeProfessionalAccessWhere(now, billingEnabled),
      {
        NOT: RESERVED_PUBLIC_PROFESSIONAL_NAMES.map((displayName) => ({
          displayName: { equals: displayName, mode: "insensitive" },
        })),
      },
    ],
  };
}

export function publicProfessionalCategoryWhere(category: string | null | undefined): Prisma.ProfessionalWhereInput | null {
  if (!category) return null;
  const normalizedCategory = category.trim().toUpperCase();
  if (normalizedCategory === "TRANS") {
    return { OR: [{ transIdentity: "SIM" }, { escortCategory: "TRANS" }] };
  }
  if (normalizedCategory === "MULHER" || normalizedCategory === "HOMEM") {
    return { OR: [{ genderIdentity: normalizedCategory }, { escortCategory: normalizedCategory }] };
  }
  return { id: { in: [] } };
}

export async function getPublicProfessionalWhere(now = new Date()) {
  const settings = await getProfessionalBillingSettings();
  return publicProfessionalWhere(now, settings.billingEnabled);
}
