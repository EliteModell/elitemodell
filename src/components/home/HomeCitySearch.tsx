"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canonicalizeBrazilianLocation,
  normalizeBrazilianState,
  normalizeLocationText,
  SUPPORTED_PUBLIC_LOCATIONS,
} from "@/lib/brazilian-location";
import styles from "./HomeCitySearch.module.css";

type ApiSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type CityChoice = {
  id: string;
  city: string;
  state: string;
  label: string;
  detail: string;
};

const localChoices: CityChoice[] = SUPPORTED_PUBLIC_LOCATIONS.map(({ city, state }) => ({
  id: `local-${normalizeLocationText(city)}-${state}`,
  city,
  state,
  label: `${city}, ${state}`,
  detail: "Brasil",
}));

function stateFromSecondaryText(value: string) {
  for (const part of value.split(",")) {
    const state = normalizeBrazilianState(part);
    if (state) return state;
  }
  return "";
}

function apiChoice(suggestion: ApiSuggestion): CityChoice | null {
  const state = stateFromSecondaryText(suggestion.secondaryText);
  const canonical = canonicalizeBrazilianLocation(suggestion.mainText, state);
  if (!canonical) return null;

  return {
    id: suggestion.placeId || `api-${normalizeLocationText(canonical.city)}-${canonical.state}`,
    city: canonical.city,
    state: canonical.state,
    label: `${canonical.city}, ${canonical.state}`,
    detail: suggestion.secondaryText || "Brasil",
  };
}

export default function HomeCitySearch() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [remoteChoices, setRemoteChoices] = useState<CityChoice[]>([]);
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const normalizedInput = normalizeLocationText(input);

  const choices = useMemo(() => {
    if (normalizedInput.length < 2) return [];
    const local = localChoices.filter((choice) => normalizeLocationText(choice.label).includes(normalizedInput));
    const unique = new Map<string, CityChoice>();
    [...local, ...remoteChoices].forEach((choice) => unique.set(`${normalizeLocationText(choice.city)}-${choice.state}`, choice));
    return [...unique.values()].slice(0, 6);
  }, [normalizedInput, remoteChoices]);

  useEffect(() => {
    if (normalizedInput.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/address/search?input=${encodeURIComponent(input.trim())}`, {
          signal: controller.signal,
        });
        const data = await response.json() as { suggestions?: ApiSuggestion[] };
        if (!response.ok) throw new Error("city_search_failed");
        setRemoteChoices((data.suggestions ?? []).map(apiChoice).filter((choice): choice is CityChoice => Boolean(choice)));
      } catch {
        if (!controller.signal.aborted) setRemoteChoices([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [input, normalizedInput]);

  function selectCity(choice: CityChoice) {
    setSelected(choice);
    setInput(choice.label);
    setRemoteChoices([]);
    setFocused(false);
    setLoading(false);
    setMessage("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exactChoice = selected ?? localChoices.find((choice) => normalizeLocationText(choice.label) === normalizedInput);
    if (!exactChoice) {
      setMessage("Selecione uma cidade sugerida para pesquisar.");
      setFocused(true);
      return;
    }

    const params = new URLSearchParams({
      tab: "acompanhantes",
      cidade: exactChoice.city,
      estado: exactChoice.state.toLowerCase(),
    });
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form className={styles.form} onSubmit={submit} role="search" aria-label="Buscar acompanhantes por cidade">
      <label className={styles.label} htmlFor="home-city-search">Buscar acompanhantes por cidade</label>
      <div className={`${styles.control} ${focused ? styles.focused : ""}`}>
        <input
          id="home-city-search"
          type="search"
          value={input}
          placeholder="Digite sua cidade"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="home-city-suggestions"
          aria-expanded={focused && choices.length > 0}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => {
            const value = event.target.value;
            setInput(value);
            setSelected(null);
            setMessage("");
            if (normalizeLocationText(value).length >= 3) setLoading(true);
            else {
              setLoading(false);
              setRemoteChoices([]);
            }
          }}
        />
        <button type="submit">Buscar perfis</button>
      </div>

      {focused && choices.length > 0 && (
        <ul className={styles.suggestions} id="home-city-suggestions" role="listbox">
          {choices.map((choice) => (
            <li key={choice.id} role="option" aria-selected={selected?.id === choice.id}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity(choice)}>
                <strong>{choice.label}</strong>
                <span>{choice.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && <span className={styles.status} role="status">Buscando cidades…</span>}
      {!loading && message && <span className={styles.error} role="alert">{message}</span>}
    </form>
  );
}
