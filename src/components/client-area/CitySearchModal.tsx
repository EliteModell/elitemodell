"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, MapPin, Search, X } from "lucide-react";

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCity: (city: string) => void;
}

export default function CitySearchModal({ open, onClose, onSelectCity }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [noResults, setNoResults] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setInput("");
      setSuggestions([]);
      setNoResults(null);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setNoResults(null);
    if (input.length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/search?input=${encodeURIComponent(input)}`);
        const data = await res.json() as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);
  }, [input]);

  async function handleSelect(suggestion: Suggestion) {
    const city = suggestion.mainText;
    setChecking(true);
    setNoResults(null);
    try {
      const res = await fetch(`/api/professionals?city=${encodeURIComponent(city)}&limit=1`);
      const data = await res.json() as { total?: number };
      if ((data.total ?? 0) > 0) {
        onSelectCity(city);
        onClose();
      } else {
        setNoResults(city);
      }
    } catch {
      onSelectCity(city);
      onClose();
    } finally {
      setChecking(false);
    }
  }

  function reset() {
    setInput("");
    setSuggestions([]);
    setNoResults(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  if (!open) return null;

  const busy = loadingSuggestions || checking;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#08090a]" style={{ animation: "premiumFadeUp 180ms ease-out both" }}>

      {/* Header */}
      <div className="border-b border-[#d4a843]/14 bg-[#08090a]/95 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#f5f0e4]/55">
            Selecionar <span className="text-[#f5d78c]">cidade</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72 transition-colors active:bg-white/10"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-b border-white/[0.06] px-4 py-4">
        <div className="mx-auto max-w-[760px]">
          <div className="flex items-center gap-3 rounded-[14px] border border-[#d4a843]/28 bg-white/[0.06] px-4 py-3.5 transition-colors focus-within:border-[#d4a843]/60 focus-within:bg-white/[0.09]">
            <MapPin className="h-5 w-5 shrink-0 text-[#d4a843]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite 3 ou mais caracteres"
              className="flex-1 bg-transparent text-[16px] font-semibold text-[#f5f0e4] outline-none placeholder:font-normal placeholder:text-[#f5f0e4]/32"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {busy && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4a843] border-t-transparent" />
            )}
            {input && !busy && (
              <button type="button" onClick={reset} className="text-[#f5f0e4]/38 active:text-[#f5f0e4]/60">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[760px]">

          {/* "Em breve" state */}
          {noResults && !checking && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-5 grid h-[68px] w-[68px] place-items-center rounded-[18px] border border-[#d4a843]/22 bg-[#d4a843]/10 shadow-[0_12px_32px_rgba(212,168,67,0.14)]">
                <Clock className="h-7 w-7 text-[#d4a843]" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4a843]">Em breve</p>
              <h2 className="mt-2 text-[22px] font-black leading-tight text-[#f5f0e4]">
                Terá acompanhantes<br />em {noResults}
              </h2>
              <p className="mt-3 max-w-[290px] text-[13px] leading-[1.7] text-[#f5f0e4]/46">
                Ainda não temos perfis verificados nessa cidade. Estamos crescendo — tente outra cidade por enquanto.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-7 rounded-[12px] border border-[#d4a843]/32 bg-[#d4a843]/12 px-6 py-3 text-[14px] font-bold text-[#f5d78c] active:bg-[#d4a843]/20"
              >
                Buscar outra cidade
              </button>
            </div>
          )}

          {/* Suggestions list */}
          {!noResults && !busy && suggestions.length > 0 && (
            <ul role="listbox">
              {suggestions.map((s) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-3.5 border-b border-white/[0.05] px-4 py-4 text-left transition-colors active:bg-white/[0.05]"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10">
                      <MapPin className="h-4 w-4 text-[#d4a843]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-[#f5f0e4]">{s.mainText}</p>
                      {s.secondaryText && (
                        <p className="truncate text-[12px] text-[#f5f0e4]/44">{s.secondaryText}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Placeholder vazio */}
          {!noResults && !busy && suggestions.length === 0 && !input && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Search className="mb-4 h-9 w-9 text-[#f5f0e4]/12" />
              <p className="text-[14px] text-[#f5f0e4]/36">Digite o nome de uma cidade para buscar</p>
            </div>
          )}

          {/* Input muito curto */}
          {!noResults && !busy && input.length > 0 && input.length < 3 && (
            <p className="px-4 py-6 text-center text-[13px] text-[#f5f0e4]/36">
              Continue digitando…
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
