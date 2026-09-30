"use client";

import { useEffect, useState } from "react";
import { suggestCities, type CitySuggestion } from "@/lib/city-catalog";

export function useCitySuggestions(input: string, enabled = true) {
  const [result, setResult] = useState<{ input: string; cities: CitySuggestion[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations/cities?input=${encodeURIComponent(input)}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data.cities)) setResult({ input, cities: data.cities });
      } catch { /* The full national catalog remains available offline. */ }
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [input, enabled]);
  return result?.input === input ? result.cities : suggestCities(input);
}
