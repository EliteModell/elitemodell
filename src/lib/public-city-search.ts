import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCityQuery, suggestCities, type CitySuggestion } from "@/lib/city-catalog";
import { normalizeLocationText } from "@/lib/brazilian-location";

// Group stored spellings before matching so legacy accents/casing remain searchable.
// Both discovery and result filtering resolve the same effective service fields.
export function professionalCityGroups(where: Prisma.ProfessionalWhereInput = { status: "ACTIVE" }) {
  return prisma.professional.groupBy({
    by: ["city", "state", "currentServiceCity", "currentServiceState"],
    where,
    _count: { _all: true },
  });
}

export function resolveExactCityQuery(value: string, state = ""): CitySuggestion | null {
  const query = parseCityQuery(value, state);
  if (!query.city) return null;
  return suggestCities(value, [], 24).find((item) =>
    normalizeLocationText(item.city) === query.city &&
    (!query.state || item.state === query.state)
  ) ?? null;
}

export async function professionalCityFilter(city: string, state = ""): Promise<Prisma.ProfessionalWhereInput> {
  const query = parseCityQuery(city, state);
  const exact = resolveExactCityQuery(city, state);
  if (!exact) return { id: { in: [] } };
  const cityVariants = Array.from(new Set([exact.city, city.trim(), query.city].filter(Boolean)));
  const stateCode = query.state || exact.state;
  return {
    OR: cityVariants.flatMap((value) => [
      {
        currentServiceCity: { equals: value, mode: "insensitive" as const },
        currentServiceState: { equals: stateCode, mode: "insensitive" as const },
      },
      {
        AND: [
          { OR: [{ currentServiceCity: null }, { currentServiceCity: "" }] },
          { city: { equals: value, mode: "insensitive" as const } },
          { state: { equals: stateCode, mode: "insensitive" as const } },
        ],
      },
    ]),
  };
}
