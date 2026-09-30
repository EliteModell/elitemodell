"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { normalizeLocationText } from "@/lib/brazilian-location";
import { useCitySuggestions } from "@/lib/use-city-suggestions";
import type { CitySuggestion } from "@/lib/city-catalog";
import styles from "./HomeCitySearch.module.css";
type CityChoice = CitySuggestion;

export default function HomeCitySearch() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState("");
  const normalizedInput = normalizeLocationText(input);

  const suggestions = useCitySuggestions(input, focused);
  const choices = normalizedInput.length >= 2 ? suggestions.slice(0, 6) : [];

  function selectCity(choice: CityChoice) {
    setSelected(choice);
    setInput(choice.label);
    setFocused(false);
    setMessage("");
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
      <input id="home-city-search" type="search" value={input} placeholder="Digite sua cidade" autoComplete="off" role="combobox"
        aria-autocomplete="list" aria-controls="home-city-suggestions" aria-expanded={focused && choices.length > 0}
        onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(event) => {
          const value = event.target.value;
          setInput(value); setSelected(null); setMessage("");
          setFocused(true);
        }}/>
      <button type="submit" aria-label="Buscar perfis"><Search aria-hidden="true" size={21}/></button>
    </div>
    {focused && choices.length > 0 && <ul className={styles.suggestions} id="home-city-suggestions" role="listbox">
      {choices.map((choice) => <li key={choice.id} role="option" aria-selected={selected?.id === choice.id}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity(choice)}>
          <strong>{choice.label}</strong><span>{choice.count ? "Perfis disponíveis" : "Brasil"}</span>
        </button>
      </li>)}
    </ul>}
    {message && <span className={styles.error} role="alert">{message}</span>}
  </form>;
}
