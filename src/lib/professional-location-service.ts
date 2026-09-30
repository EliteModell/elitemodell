import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PreviousLocation = { city: string; state: string; neighborhood?: string | null };

function previous(value: unknown): PreviousLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.city !== "string" || typeof record.state !== "string") return null;
  return { city: record.city, state: record.state, neighborhood: typeof record.neighborhood === "string" ? record.neighborhood : null };
}

export async function refreshExpiredTemporaryLocations(now = new Date()) {
  const scheduled = await prisma.professional.findMany({
    where: { temporaryLocationFrom: { lte: now }, temporaryLocationUntil: { gt: now }, previousServiceLocation: { not: Prisma.DbNull } },
    select: { id: true, city: true, state: true, bairro: true, locationChanges: { where: { changeType: "TEMPORARY", verificationStatus: "VERIFIED" }, orderBy: { createdAt: "desc" }, take: 1 } },
    take: 100,
  });
  for (const profile of scheduled) {
    const target = profile.locationChanges[0];
    if (!target || (profile.city === target.toCity && profile.state === target.toState && profile.bairro === target.toNeighborhood)) continue;
    await prisma.professional.update({ where: { id: profile.id }, data: {
      city: target.toCity, state: target.toState, bairro: target.toNeighborhood,
      currentServiceCity: target.toCity, currentServiceState: target.toState, currentServiceNeighborhood: target.toNeighborhood,
      locationUpdatedAt: now, locationVerificationStatus: "VERIFIED",
    } });
  }

  const expired = await prisma.professional.findMany({
    where: { temporaryLocationUntil: { lte: now }, previousServiceLocation: { not: Prisma.DbNull } },
    select: { id: true, city: true, state: true, bairro: true, previousServiceLocation: true },
    take: 100,
  });
  for (const profile of expired) {
    const restore = previous(profile.previousServiceLocation);
    if (!restore) continue;
    await prisma.$transaction([
      prisma.professional.update({
        where: { id: profile.id },
        data: {
          city: restore.city, state: restore.state, bairro: restore.neighborhood ?? null,
          currentServiceCity: restore.city, currentServiceState: restore.state, currentServiceNeighborhood: restore.neighborhood ?? null,
          temporaryLocationFrom: null, temporaryLocationUntil: null, previousServiceLocation: Prisma.DbNull,
          locationUpdatedAt: now, locationVerificationStatus: "VERIFIED",
        },
      }),
      prisma.professionalLocationChange.create({ data: {
        professionalId: profile.id, fromCity: profile.city, fromState: profile.state, fromNeighborhood: profile.bairro,
        toCity: restore.city, toState: restore.state, toNeighborhood: restore.neighborhood ?? null,
        changeType: "TEMPORARY_RETURN", verificationStatus: "VERIFIED", effectiveFrom: now,
      } }),
    ]);
  }
  return scheduled.length + expired.length;
}
