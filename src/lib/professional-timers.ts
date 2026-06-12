import { prisma } from "@/lib/prisma";

export async function refreshExpiredProfessionalTimers(now = new Date()) {
  await prisma.$transaction([
    prisma.professional.updateMany({
      where: {
        status: "PAUSED",
        verified: true,
        pauseUntil: { lt: now },
      },
      data: {
        status: "ACTIVE",
        pauseStartedAt: null,
        pauseUntil: null,
        pauseReason: null,
      },
    }),
    prisma.professional.updateMany({
      where: {
        boostActive: true,
        boostUntil: { lt: now },
      },
      data: {
        boostActive: false,
        boostStartedAt: null,
        boostUntil: null,
        boostSource: null,
      },
    }),
    prisma.professional.updateMany({
      where: {
        listingPhoneUntil: { lt: now },
      },
      data: {
        listingPhoneUntil: null,
      },
    }),
    prisma.professional.updateMany({
      where: {
        activePlanId: { not: null },
        user: { premiumUntil: { lt: now } },
      },
      data: {
        activePlanId: null,
        planPriority: 0,
      },
    }),
  ]);
}
