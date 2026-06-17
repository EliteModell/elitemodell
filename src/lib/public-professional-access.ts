import "server-only";

import type { Prisma } from "@prisma/client";
import { activeProfessionalAccessWhere } from "@/lib/professional-access";

export function publicProfessionalWhere(
  now = new Date(),
): Prisma.ProfessionalWhereInput {
  return {
    status: "ACTIVE",
    AND: [
      { OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }] },
      activeProfessionalAccessWhere(now),
    ],
  };
}
