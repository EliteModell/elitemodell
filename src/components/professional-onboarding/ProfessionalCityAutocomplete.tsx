"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  canonicalizeBrazilianLocation,
  normalizeBrazilianState,
  normalizeLocationText,
  SUPPORTED_PUBLIC_LOCATIONS,
} from "@/lib/brazilian-location";

type ApiSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type CityChoice = {
  id: string;
  city: string;
  state: string;
  detail: string;
};

type Props = {
  city: string;
  state: string;
  placeId?: string;
  invalid?: boolean;
  onChange: (value: { city: string; state: string; placeId: string }) => void;
};

const localChoices: CityChoice[] = SUPPORTED_PUBLIC_LOCATIONS.map(({ city, state }) => ({
  id: `local-${normalizeLocationText(city)}-${state}`,
  city,
  state,
  detail: "Brasil",
}));

function stateFromSecondaryText(value: string) {
  for (const part of value.split(",")) {
    const state = normalizeBrazilianState(part);
    if (state) return state;
  }
  return "";
}

function toChoice(suggestion: ApiSuggestion): CityChoice | null {
  const state = stateFromSecondaryText(suggestion.secondaryText);
  const location = canonicalizeBrazilianLocation(suggestion.mainText, state);
  if (!location) return null;
  return {
    id: suggestion.placeId || `google-${normalizeLocationText(location.city)}-${location.state}`,
    city: location.city,
    state: location.state,
    detail: suggestion.secondaryText || "Brasil",
  };
}

export default function ProfessionalCityAutocomplete({ city, state, placeId, invalid, onChange }: Props) {
  const listId = useId();
  const [remote, setRemote] = useState<CityChoice[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const normalized = normalizeLocationText(city);

  const choices = useMemo(() => {
    if (normalized.length < 2) return [];
    const local = localChoices.filter((choice) => normalizeLocationText(`${choice.city} ${choice.state}`).includes(normalized));
    const unique = new Map<string, CityChoice>();
    [...local, ...remote].forEach((choice) => unique.set(`${normalizeLocationText(choice.city)}-${choice.state}`, choice));
    return [...unique.values()].slice(0, 7);
  }, [normalized, remote]);

  useEffect(() => {
    if (normalized.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/address/search?input=${encodeURIComponent(city.trim())}`, { signal: controller.signal });
        const data = await response.json() as { suggestions?: ApiSuggestion[] };
        if (!response.ok) throw new Error("city_search_failed");
        setRemote((data.suggestions ?? []).map(toChoice).filter((choice): choice is CityChoice => Boolean(choice)));
        setProviderUnavailable(false);
      } catch {
        if (!controller.signal.aborted) {
          setRemote([]);
          setProviderUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, normalized]);

  function select(choice: CityChoice) {
    setOpen(false);
    setRemote([]);
    onChange({ city: choice.city, state: choice.state, placeId: choice.id });
  }

  return (
    <div className="professional-city-autocomplete">
      <input
        data-field="city"
        data-place-id={placeId || undefined}
        value={city}
        placeholder="Selecione sua cidade"
        autoComplete="address-level2"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && choices.length > 0}
        aria-invalid={invalid || undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          const value = event.target.value;
          setOpen(true);
          if (normalizeLocationText(value).length < 3) {
            setRemote([]);
            setLoading(false);
            setProviderUnavailable(false);
          }
          onChange({ city: value, state: value.trim() ? state : "", placeId: "" });
        }}
      />
      {open && choices.length > 0 && (
        <ul id={listId} role="listbox">
          {choices.map((choice) => (
            <li key={choice.id} role="option" aria-selected={city === choice.city && state === choice.state}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => select(choice)}>
                <strong>{choice.city}, {choice.state}</strong>
                <span>{choice.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <span className="city-status" role="status">Buscando cidades...</span>}
      {!loading && providerUnavailable && (
        <span className="city-status">Busca automática indisponível. Digite a cidade e selecione a UF.</span>
      )}
    </div>
  );
}
