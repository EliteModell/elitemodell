export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import {
  canonicalizeBrazilianLocation,
  nearestSupportedLocation,
  normalizeBrazilianState,
} from "@/lib/brazilian-location";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type BigDataCloudAdministrativeArea = {
  name?: string;
  adminLevel?: number;
  isoCode?: string;
};

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  localityInfo?: {
    administrative?: BigDataCloudAdministrativeArea[];
  };
};

function pickAddressPart(components: AddressComponent[], type: string, short = false) {
  const component = components.find((item) => item.types?.includes(type));
  return short ? component?.shortText ?? component?.short_name ?? "" : component?.longText ?? component?.long_name ?? "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim();
  const address = searchParams.get("address")?.trim();
  const latlng = searchParams.get("latlng")?.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!latlng) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }
  } else {
    const limited = await enforceRateLimitAsync(
      `reverse-geocode:${getClientIP(req)}`,
      20,
      60 * 60 * 1000,
      "Muitas consultas de localizacao.",
    );
    if (limited) return limited;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://elitemodell.com.br";

  if (placeId) {
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY não configurada." }, { status: 501 });
    }
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
        "Referer": appUrl,
      },
    });

    if (!res.ok) return NextResponse.json({ error: "Erro ao buscar endereço no Google Places." }, { status: 502 });
    const place = await res.json();
    const components = place.addressComponents ?? [];

    return NextResponse.json({
      provider: "google",
      address: place.formattedAddress ?? "",
      bairro: pickAddressPart(components, "sublocality_level_1") || pickAddressPart(components, "political"),
      city: pickAddressPart(components, "administrative_area_level_2"),
      state: pickAddressPart(components, "administrative_area_level_1", true),
      zipCode: pickAddressPart(components, "postal_code"),
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
    });
  }

  if (latlng) {
    const [latStr, lngStr] = latlng.split(",");
    const latitude = Number(latStr);
    const longitude = Number(lngStr);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
    }
    const failures: string[] = [];

    // PRIMARY: BigDataCloud (free, no API key required)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`,
        {
          headers: { "Referer": appUrl },
          signal: AbortSignal.timeout(4500),
        },
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json() as BigDataCloudResponse;
        const municipality = bdc.localityInfo?.administrative
          ?.find((area) => area.adminLevel === 8)?.name;
        const city = municipality || bdc.city || bdc.locality;
        const state =
          normalizeBrazilianState(bdc.principalSubdivisionCode) ||
          normalizeBrazilianState(bdc.principalSubdivision) ||
          normalizeBrazilianState(
            bdc.localityInfo?.administrative?.find((area) => area.adminLevel === 4)?.isoCode,
          );
        const location = canonicalizeBrazilianLocation(city, state);
        if (location) {
          return NextResponse.json({ provider: "bigdatacloud", ...location });
        }
        failures.push("bigdatacloud_without_city");
      } else {
        failures.push(`bigdatacloud_http_${bdcRes.status}`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? `bigdatacloud_${error.name}` : "bigdatacloud_error");
    }

    // FALLBACK: Google Geocoding API
    if (apiKey) {
      try {
        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("latlng", `${latitude},${longitude}`);
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("key", apiKey);
        const res = await fetch(url, {
          headers: { "Referer": appUrl },
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const data = await res.json() as { results?: { address_components: AddressComponent[] }[] };
          const result = data.results?.[0];
          if (result) {
            const components = result.address_components ?? [];
            const location = canonicalizeBrazilianLocation(
              pickAddressPart(components, "administrative_area_level_2") ||
                pickAddressPart(components, "locality"),
              pickAddressPart(components, "administrative_area_level_1", true),
            );
            if (location) {
              return NextResponse.json({ provider: "google", ...location });
            }
          }
        }
        failures.push(res.ok ? "google_without_city" : `google_http_${res.status}`);
      } catch (error) {
        failures.push(error instanceof Error ? `google_${error.name}` : "google_error");
      }
    }

    const nearbyLocation = nearestSupportedLocation(latitude, longitude);
    if (nearbyLocation) {
      console.warn("[reverse-geocode] Provedores indisponíveis; usando cidade suportada mais próxima.", {
        latitude,
        longitude,
        failures,
        nearbyLocation,
      });
      return NextResponse.json({ provider: "supported-city-fallback", ...nearbyLocation });
    }

    console.error("[reverse-geocode] Não foi possível identificar a cidade.", {
      latitude,
      longitude,
      failures,
    });
    return NextResponse.json(
      { error: "Cidade não encontrada.", code: "CITY_NOT_FOUND", failures },
      { status: 404 },
    );
  }

  if (!address) return NextResponse.json({ error: "Informe placeId, latlng ou address." }, { status: 400 });
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY não configurada." }, { status: 501 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("components", "country:BR");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url, { headers: { "Referer": appUrl } });
  if (!res.ok) return NextResponse.json({ error: "Erro ao geocodificar endereço." }, { status: 502 });

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });

  const components = result.address_components ?? [];
  return NextResponse.json({
    provider: "google",
    address: result.formatted_address ?? address,
    bairro: pickAddressPart(components, "sublocality_level_1") || pickAddressPart(components, "political"),
    city: pickAddressPart(components, "administrative_area_level_2"),
    state: pickAddressPart(components, "administrative_area_level_1", true),
    zipCode: pickAddressPart(components, "postal_code"),
    latitude: result.geometry?.location?.lat,
    longitude: result.geometry?.location?.lng,
  });
}
