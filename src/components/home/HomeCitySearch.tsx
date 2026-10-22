"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { normalizeLocationText } from "@/lib/brazilian-location";
import { useCitySuggestions } from "@/lib/use-city-suggestions";
import { savePublicLocationPreference } from "@/lib/public-location-preference";
import type { CitySuggestion } from "@/lib/city-catalog";
import styles from "./HomeCitySearch.module.css";
type CityChoice = CitySuggestion;

export default function HomeCitySearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestionMaxHeight, setSuggestionMaxHeight] = useState(270);
  const normalizedInput = normalizeLocationText(input);

  const suggestions = useCitySuggestions(input, focused);
  const choices = normalizedInput.length >= 2 ? suggestions.slice(0, 6) : [];

  useEffect(() => {
    if (!focused) return;
    const keepSearchVisible = () => {
      inputRef.current?.scrollIntoView({ block: "start" });
      window.requestAnimationFrame(() => {
        const inputBottom = inputRef.current?.getBoundingClientRect().bottom ?? 0;
        const viewport = window.visualViewport;
        const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
        setSuggestionMaxHeight(Math.max(96, Math.min(270, Math.floor(viewportBottom - inputBottom - 16))));
      });
    };
    keepSearchVisible();
    const delayed = window.setTimeout(keepSearchVisible, 250);
    window.visualViewport?.addEventListener("resize", keepSearchVisible);
    window.visualViewport?.addEventListener("scroll", keepSearchVisible);
    return () => {
      window.clearTimeout(delayed);
      window.visualViewport?.removeEventListener("resize", keepSearchVisible);
      window.visualViewport?.removeEventListener("scroll", keepSearchVisible);
    };
  }, [focused, choices.length]);

  function selectCity(choice: CityChoice) {
    setSelected(choice);
    setInput(choice.label);
    setFocused(false);
    setMessage("");
    savePublicLocationPreference({ city: choice.city, state: choice.state, label: choice.label });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exactChoice = selected ?? choices.find((choice) => normalizeLocationText(choice.label) === normalizedInput);
    if (!exactChoice) {
      setMessage("Selecione uma cidade sugerida para pesquisar.");
      setFocused(true);
      return;
    }
    const params = new URLSearchParams({ tab: "acompanhantes", cidade: exactChoice.city, estado: exactChoice.state.toLowerCase() });
    router.push(`/buscar?${params.toString()}`);
  }

  return <form className={styles.form} onSubmit={submit} role="search" aria-label="Buscar acompanhantes por cidade">
    <label className={styles.label} htmlFor="home-city-search">Buscar acompanhantes por cidade</label>
    <div className={`${styles.control} ${focused ? styles.focused : ""}`}>
      <input ref={inputRef} id="home-city-search" type="search" value={input} placeholder="Digite sua cidade" autoComplete="off" role="combobox"
        aria-autocomplete="list" aria-controls="home-city-suggestions" aria-expanded={focused && choices.length > 0}
        onFocus={() => {
          setFocused(true);
          inputRef.current?.scrollIntoView({ block: "start" });
        }} onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(event) => {
          const value = event.target.value;
          setInput(value); setSelected(null); setMessage("");
          setFocused(true);
        }}/>
      <button type="submit" aria-label="Buscar perfis"><Search aria-hidden="true" size={21}/></button>
    </div>
    {focused && choices.length > 0 && <ul className={styles.suggestions} id="home-city-suggestions" role="listbox" style={{ maxHeight: suggestionMaxHeight }}>
      {choices.map((choice) => <li key={choice.id} role="option" aria-selected={selected?.id === choice.id}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity(choice)}>
          <strong>{choice.label}</strong><span>{choice.count ? "Perfis disponíveis" : "Brasil"}</span>
        </button>
      </li>)}
    </ul>}
    {message && <span className={styles.error} role="alert">{message}</span>}
  </form>;
}
