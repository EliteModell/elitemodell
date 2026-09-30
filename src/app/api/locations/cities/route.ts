import { NextRequest, NextResponse } from "next/server";
import { suggestCities } from "@/lib/city-catalog";
import { professionalCityGroups } from "@/lib/public-city-search";
import { publicServiceLocation } from "@/lib/professional-location";
import { activeProfessionalAccessWhere } from "@/lib/professional-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.slice(0, 120) ?? "";
  const now = new Date();
  try {
    const groups = await professionalCityGroups({ status: "ACTIVE", AND: [
      { OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }] }, activeProfessionalAccessWhere(now),
    ] });
    const populated = groups.map((group) => ({ ...publicServiceLocation(group), count: group._count._all }));
    return NextResponse.json({ cities: suggestCities(input, populated) });
  } catch (error) {
    console.error("[city-search] Unable to rank registered cities", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ cities: suggestCities(input), degraded: true });
  }
}
