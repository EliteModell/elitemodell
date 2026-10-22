import { NextResponse } from "next/server";
import { canonicalizeBrazilianLocation, normalizeLocationText } from "@/lib/brazilian-location";
import { professionalCityGroups } from "@/lib/public-city-search";
import { publicProfessionalWhere } from "@/lib/public-professional-access";
import { publicServiceLocation } from "@/lib/professional-location";
import { getProfessionalBillingSettings } from "@/lib/professional-access";
import { publicCacheHeaders } from "@/lib/public-professional-profile";

export const dynamic = "force-dynamic";

type AvailableCity = {
  city: string;
  state: string;
  count: number;
};

export async function GET() {
  const now = new Date();

  try {
    const billingSettings = await getProfessionalBillingSettings();
    const groups = await professionalCityGroups(
      publicProfessionalWhere(now, billingSettings.billingEnabled),
    );
    const citiesByKey = new Map<string, AvailableCity>();

    for (const group of groups) {
      const serviceLocation = publicServiceLocation(group);
      const location = canonicalizeBrazilianLocation(serviceLocation.city, serviceLocation.state);
      if (!location) continue;

      const key = `${normalizeLocationText(location.city)}|${location.state}`;
      const current = citiesByKey.get(key);
      citiesByKey.set(key, {
        ...location,
        count: (current?.count ?? 0) + group._count._all,
      });
    }

    const cities = [...citiesByKey.values()].sort((left, right) =>
      right.count - left.count ||
      left.city.localeCompare(right.city, "pt-BR") ||
      left.state.localeCompare(right.state),
    );

    return NextResponse.json({ cities }, { headers: publicCacheHeaders() });
  } catch (error) {
    console.error(
      "[available-cities] Unable to count published professionals",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { error: "Não foi possível carregar as cidades disponíveis agora." },
      { status: 500, headers: publicCacheHeaders() },
    );
  }
}
