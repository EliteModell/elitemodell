"use client";

/* eslint-disable react-hooks/set-state-in-effect -- The selector resets transient search state when opened. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Crown, Diamond, LockKeyhole, MapPin, Search, ShieldCheck, X } from "lucide-react";

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export default function CitySelectorScreen({
  onClose,
  onSelectCity,
}: {
  onClose: () => void;
  onSelectCity: (city: string) => void;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [noResults, setNoResults] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setInput("");
    setSuggestions([]);
    setNoResults(null);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 140);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (input.length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/search?input=${encodeURIComponent(input)}`);
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [input]);

  async function handleSelect(suggestion: Suggestion) {
    const selectedCity = suggestion.secondaryText
      ? `${suggestion.mainText}, ${suggestion.secondaryText.split(",")[0]}`
      : suggestion.mainText;
    setChecking(true);
    setNoResults(null);
    onSelectCity(selectedCity);
    setChecking(false);
  }

  function reset() {
    setInput("");
    setSuggestions([]);
    setNoResults(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function handleCityFocus() {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  }

  const busy = loadingSuggestions || checking;

  return (
    <div className="client-city-select">
      <div className="client-city-bg" />

      <div className="client-city-wrap">
        <header className="client-city-header">
          <span className="client-city-logo">
            <span className="client-city-logo-gold">elite</span>
            <span className="client-city-logo-white">modell</span>
            <span className="client-city-logo-star">✦</span>
          </span>
          <button type="button" onClick={onClose} className="client-city-close" aria-label="Fechar">
            <X />
          </button>
        </header>

        <section className="client-city-hero">
          <p className="client-city-kicker">EXPLORAR PERFIS</p>
          <h1 className="client-city-title">
            Selecionar<br />cidade <span>✦</span>
          </h1>
          <p className="client-city-subtitle">
            Escolha uma cidade para ver<br />os perfis disponíveis
          </p>
          <Image
            src="/brand/elite-modell%20gps.png"
            alt=""
            width={640}
            height={520}
            priority
            sizes="(max-width: 430px) 100vw, 320px"
            className="client-city-hero-image"
          />
        </section>

        <section className="client-city-search-section">
          <div className="client-city-search">
            <div className="client-city-search-icon">
              <MapPin />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setNoResults(null);
              }}
              placeholder="Digite 3 ou mais caracteres"
              className="client-city-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onFocus={handleCityFocus}
            />
            <div className="client-city-search-action">
              {busy ? (
                <div className="client-city-spinner" />
              ) : input ? (
                <button type="button" onClick={reset} className="client-city-clear" aria-label="Limpar busca">
                  <X />
                </button>
              ) : (
                <Search />
              )}
            </div>
          </div>
        </section>

        <main className="client-city-main">
          {noResults && !checking && (
            <div className="client-city-empty">
              <p>Em breve</p>
              <h2>
                Terá acompanhantes<br />em {noResults}
              </h2>
              <button type="button" onClick={reset}>
                <Search />
                Buscar outra cidade
              </button>
            </div>
          )}

          {!noResults && !busy && suggestions.length > 0 && (
            <ul className="client-city-suggestions" role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(s)}
                    style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <span className="client-city-suggestion-icon">
                      <MapPin />
                    </span>
                    <span>
                      <strong>{s.mainText}</strong>
                      {s.secondaryText && <small>{s.secondaryText}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!noResults && !busy && suggestions.length === 0 && (
            <div className="space-y-[44px]">
              <div className="flex items-center gap-5 rounded-[18px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)] sm:p-7">
                <div className="grid h-[82px] w-[82px] shrink-0 place-items-center rounded-[17px] bg-[#17130c]/88">
                  <Diamond className="h-12 w-12 text-[#facc15]" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[21px] font-black leading-tight text-[#facc15] sm:text-[24px]">Encontre perfis exclusivos</h2>
                  <p className="mt-3 text-[15px] leading-[1.55] text-[#fffaf0]/60 sm:text-[18px]">
                    Explore modelos e talentos na sua cidade com recursos premium.
                  </p>
                </div>
                <button
                  type="button"
                  className="hidden min-h-[58px] shrink-0 items-center gap-3 rounded-[12px] border border-[#facc15]/55 bg-[linear-gradient(135deg,rgba(250,204,21,0.34),rgba(104,74,18,0.78))] px-7 text-[16px] font-black text-[#facc15] shadow-[0_0_34px_rgba(250,204,21,0.14)] transition hover:brightness-110 active:scale-95 sm:flex"
                >
                  Seja Premium
                  <Crown className="h-5 w-5 fill-[#facc15]/30" />
                </button>
              </div>
              <div className="space-y-8 px-4">
                <div className="flex items-center gap-5">
                  <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[16px] bg-[#17130c]/88 text-[#facc15]">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black text-[#fffaf0]">Ambiente seguro e verificado</h3>
                    <p className="mt-2 text-[16px] leading-snug text-[#fffaf0]/58">Seus dados estão protegidos conosco.</p>
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center gap-5">
                  <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[16px] bg-[#17130c]/88 text-[#facc15]">
                    <LockKeyhole className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black text-[#fffaf0]">Privacidade garantida</h3>
                    <p className="mt-2 text-[16px] leading-snug text-[#fffaf0]/58">Informações 100% seguras.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
