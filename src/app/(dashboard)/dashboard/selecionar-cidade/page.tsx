"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Crown, Diamond, LockKeyhole, MapPin, Search, ShieldCheck, X } from "lucide-react";

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export default function SelecionarCidadePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    delete document.body.dataset.clientDashboard;
    delete document.body.dataset.clientExplore;
    delete document.body.dataset.clientFiltersOpen;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 160);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(debounceRef.current);
      delete document.body.dataset.clientFiltersOpen;
    };
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (input.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/address/search?input=${encodeURIComponent(input.trim())}`);
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [input]);

  function handleSelect(suggestion: Suggestion) {
    const selectedCity = suggestion.secondaryText
      ? `${suggestion.mainText}, ${suggestion.secondaryText.split(",")[0]}`
      : suggestion.mainText;

    window.localStorage.setItem("elite-client-city", selectedCity);
    router.back();
  }

  return (
    <main className="city-select-page">
      <section className="city-select-hero">
        <Image
          src="/brand/elite-modell%20gps.png"
          alt=""
          width={760}
          height={620}
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          className="city-select-bg-image"
        />

        <header className="city-select-header">
          <span className="city-select-logo" aria-label="EliteModell">
            <span>elite</span>
            <strong>modell</strong>
            <em>✦</em>
          </span>
          <button type="button" onClick={() => router.back()} className="city-select-close" aria-label="Fechar">
            <X />
          </button>
        </header>

        <div className="city-select-copy">
          <p>EXPLORAR PERFIS</p>
          <h1>
            Selecionar<br />cidade <span>✦</span>
          </h1>
          <strong>Escolha uma cidade para ver os perfis disponíveis</strong>
        </div>
      </section>

      <section className="city-select-search-section">
        <label className="city-select-search">
          <span className="city-select-pin">
            <MapPin />
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Digite 3 ou mais caracteres"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className="city-select-search-icon">
            <Search />
          </span>
        </label>

        <div className="city-select-results">
          {input.trim().length < 3 ? (
            <p>Digite pelo menos 3 caracteres para buscar uma cidade.</p>
          ) : loading ? (
            <p>Buscando cidades...</p>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion) => (
                <li key={suggestion.placeId}>
                  <button type="button" onClick={() => handleSelect(suggestion)}>
                    <MapPin />
                    <span>
                      <strong>{suggestion.mainText}</strong>
                      {suggestion.secondaryText ? <small>{suggestion.secondaryText}</small> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma cidade encontrada com esse termo.</p>
          )}
        </div>
      </section>

      <section className="city-select-premium-card">
        <span>
          <Diamond />
        </span>
        <div>
          <h2>Encontre perfis exclusivos</h2>
          <p>Explore modelos e talentos na sua cidade com recursos premium.</p>
        </div>
        <button type="button">
          Seja Premium
          <Crown />
        </button>
      </section>

      <section className="city-select-trust-list">
        <article>
          <span>
            <ShieldCheck />
          </span>
          <div>
            <h3>Ambiente seguro e verificado</h3>
            <p>Seus dados estão protegidos conosco.</p>
          </div>
        </article>
        <article>
          <span>
            <LockKeyhole />
          </span>
          <div>
            <h3>Privacidade garantida</h3>
            <p>Informações 100% seguras.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
