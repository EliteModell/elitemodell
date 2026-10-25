import { type NextRequest, NextResponse } from "next/server";
import { canonicalizeBrazilianLocation } from "@/lib/brazilian-location";
import { cityKey } from "@/lib/city-catalog";
import { professionalCityGroups } from "@/lib/public-city-search";
import { publicProfessionalCategoryWhere, publicProfessionalWhere } from "@/lib/public-professional-access";
import { publicServiceLocation } from "@/lib/professional-location";
import { getProfessionalBillingSettings } from "@/lib/professional-access";
import { publicCacheHeaders } from "@/lib/public-professional-profile";

export const dynamic = "force-dynamic";

type AvailableCity = {
  city: string;
  state: string;
  count: number;
};

export async function GET(request: NextRequest) {
  const now = new Date();

  try {
    const billingSettings = await getProfessionalBillingSettings();
    const eligibility = publicProfessionalWhere(now, billingSettings.billingEnabled);
    const categoryFilter = publicProfessionalCategoryWhere(request.nextUrl.searchParams.get("category"));
    const groups = await professionalCityGroups(categoryFilter
      ? { AND: [eligibility, categoryFilter] }
      : eligibility);
    const citiesByKey = new Map<string, AvailableCity>();

    for (const group of groups) {
      const serviceLocation = publicServiceLocation(group);
      const location = canonicalizeBrazilianLocation(serviceLocation.city, serviceLocation.state);
      if (!location) continue;

      const key = cityKey(location.city, location.state);
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
