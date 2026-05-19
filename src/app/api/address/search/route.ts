export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type GooglePlaceSuggestion = {
  placePrediction?: GooglePlacePrediction;
};

type GooglePlacePrediction = {
  place?: string;
  text?: { text?: string };
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input")?.trim() ?? "";
  const sessionToken = searchParams.get("sessionToken")?.trim() || undefined;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (input.length < 3) return NextResponse.json({ suggestions: [], provider: "none" });

  if (!apiKey) {
    return NextResponse.json({
      suggestions: [],
      provider: "fallback",
      message: "GOOGLE_MAPS_API_KEY não configurada.",
    });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.place,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["br"],
      languageCode: "pt-BR",
      regionCode: "BR",
      sessionToken,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ suggestions: [], provider: "google", error: "Erro no Google Places." }, { status: 502 });
  }

  const data = await res.json() as { suggestions?: GooglePlaceSuggestion[] };
  const suggestions = (data.suggestions ?? [])
    .map((item) => item.placePrediction)
    .filter((prediction): prediction is GooglePlacePrediction => Boolean(prediction))
    .map((prediction) => ({
      placeId: String(prediction.place ?? "").replace("places/", ""),
      text: prediction.text?.text ?? "",
      mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "",
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
    }));

  return NextResponse.json({ suggestions, provider: "google" });
}
