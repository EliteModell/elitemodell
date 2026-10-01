import { NextRequest, NextResponse } from "next/server";
import { suggestCities } from "@/lib/city-catalog";
import { normalizeLocationText } from "@/lib/brazilian-location";
import { professionalCityFilter, professionalCityGroups } from "@/lib/public-city-search";
import { publicServiceLocation } from "@/lib/professional-location";
import { getProfessionalBillingSettings } from "@/lib/professional-access";
import { publicProfessionalWhere } from "@/lib/public-professional-access";
import { publicCacheHeaders } from "@/lib/public-professional-profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.slice(0, 120) ?? "";
  const candidates = suggestCities(input, [], 12);
  if (normalizeLocationText(input).length < 2 || candidates.length === 0) {
    return NextResponse.json({ cities: candidates }, { headers: publicCacheHeaders() });
  }
  const now = new Date();
  try {
    const [billingSettings, candidateFilters] = await Promise.all([
      getProfessionalBillingSettings(),
      Promise.all(candidates.map((candidate) => professionalCityFilter(candidate.city, candidate.state))),
    ]);
    const groups = await professionalCityGroups({ AND: [
      publicProfessionalWhere(now, billingSettings.billingEnabled),
      { OR: candidateFilters },
    ] });
    const populated = groups.map((group) => ({ ...publicServiceLocation(group), count: group._count._all }));
    return NextResponse.json({ cities: suggestCities(input, populated) }, { headers: publicCacheHeaders() });
  } catch (error) {
    console.error("[city-search] Unable to rank registered cities", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ cities: suggestCities(input), degraded: true });
  }
}
