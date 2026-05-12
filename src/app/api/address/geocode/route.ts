export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

function pickAddressPart(components: any[], type: string, short = false) {
  const component = components.find((item) => item.types?.includes(type));
  return short ? component?.shortText ?? component?.short_name ?? "" : component?.longText ?? component?.long_name ?? "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim();
  const address = searchParams.get("address")?.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY nao configurada." }, { status: 501 });
  }

  if (placeId) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
      },
    });

    if (!res.ok) return NextResponse.json({ error: "Erro ao buscar endereco no Google Places." }, { status: 502 });
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

  if (!address) return NextResponse.json({ error: "Informe placeId ou address." }, { status: 400 });

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("components", "country:BR");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Erro ao geocodificar endereco." }, { status: 502 });

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return NextResponse.json({ error: "Endereco nao encontrado." }, { status: 404 });

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
