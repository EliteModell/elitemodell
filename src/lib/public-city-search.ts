import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCityQuery } from "@/lib/city-catalog";
import { normalizeLocationText, normalizeBrazilianState } from "@/lib/brazilian-location";
import { publicServiceLocation } from "@/lib/professional-location";

// Group stored spellings before matching so legacy accents/casing remain searchable.
// Both discovery and result filtering resolve the same effective service fields.
export function professionalCityGroups(where: Prisma.ProfessionalWhereInput = { status: "ACTIVE" }) {
  return prisma.professional.groupBy({
    by: ["city", "state", "currentServiceCity", "currentServiceState"],
    where,
    _count: { _all: true },
  });
}

export async function professionalCityFilter(city: string, state = ""): Promise<Prisma.ProfessionalWhereInput> {
  const query = parseCityQuery(city, state);
  const groups = await professionalCityGroups();
  const matches = groups.filter((group) => {
    const location = publicServiceLocation(group);
    return normalizeLocationText(location.city) === query.city && (!query.state || normalizeBrazilianState(location.state) === query.state);
  });
  // Prisma can discard an empty OR nested in AND; make no-match explicit.
  if (matches.length === 0) return { id: { in: [] } };
  return { OR: matches.map(({ city, state, currentServiceCity, currentServiceState }) => ({ city, state, currentServiceCity, currentServiceState })) };
}
