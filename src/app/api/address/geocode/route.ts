export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};

function pickAddressPart(components: AddressComponent[], type: string, short = false) {
  const component = components.find((item) => item.types?.includes(type));
  return short ? component?.shortText ?? component?.short_name ?? "" : component?.longText ?? component?.long_name ?? "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim();
  const address = searchParams.get("address")?.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY não configurada." }, { status: 501 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://elitemodell.com.br";

  if (placeId) {
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

  const latlng = searchParams.get("latlng")?.trim();
  if (latlng) {
    const [latStr, lngStr] = latlng.split(",");

    // PRIMARY: BigDataCloud (free, no API key required)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latStr}&longitude=${lngStr}&localityLanguage=pt`,
        { headers: { "Referer": appUrl } },
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json() as { city?: string; locality?: string; principalSubdivisionCode?: string };
        const city = bdc.city || bdc.locality;
        const state = (bdc.principalSubdivisionCode ?? "").replace("BR-", "");
        if (city) {
          return NextResponse.json({ provider: "bigdatacloud", city, state });
        }
      }
    } catch { /* fallback below */ }

    // FALLBACK: Google Geocoding API
    if (apiKey) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", latlng);
      url.searchParams.set("language", "pt-BR");
      url.searchParams.set("key", apiKey);
      const res = await fetch(url, { headers: { "Referer": appUrl } });
      if (res.ok) {
        const data = await res.json() as { results?: { address_components: AddressComponent[] }[] };
        const result = data.results?.[0];
        if (result) {
          const components = result.address_components ?? [];
          return NextResponse.json({
            provider: "google",
            city: pickAddressPart(components, "administrative_area_level_2"),
            state: pickAddressPart(components, "administrative_area_level_1", true),
          });
        }
      }
    }

    return NextResponse.json({ error: "Cidade não encontrada." }, { status: 404 });
  }

  if (!address) return NextResponse.json({ error: "Informe placeId, latlng ou address." }, { status: 400 });

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
