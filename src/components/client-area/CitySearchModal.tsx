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
      setTimeout(() => inputRef.current?.focus(), 140);
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
    <div
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#060708]"
      style={{ animation: "premiumFadeUp 200ms ease-out both" }}
    >
      {/* ── Top bar ── */}
      <div className="relative shrink-0 border-b border-[#d4a843]/16 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+18px)]">
        {/* Linha dourada topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent_0%,#d4a843_30%,#f5d78c_50%,#d4a843_70%,transparent_100%)]" />

        {/* Logo + fechar */}
        <div className="flex items-center justify-between">
          <span className="text-[20px] font-black leading-none tracking-tight">
            <span className="bg-[linear-gradient(135deg,#ffe5a0_0%,#d4a843_42%,#f5d78c_100%)] bg-clip-text text-transparent">elite</span>
            <span className="text-[#f5f0e4]">modell</span>
            <span className="ml-1 text-[#f5d78c]">✦</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-white/10 bg-white/[0.06] text-[#f5f0e4]/65 transition-colors active:bg-white/10"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Título */}
        <div className="mt-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4a843]/80">Explorar</p>
          <h1 className="mt-1 text-[26px] font-black leading-tight text-[#f5f0e4]">
            Selecionar cidade
          </h1>
          <p className="mt-1.5 text-[13px] text-[#f5f0e4]/42">
            Escolha uma cidade para ver os perfis disponíveis
          </p>
        </div>

        {/* Campo de busca */}
        <div className="mt-5">
          <div
            className="flex items-center gap-3 rounded-[16px] px-4 py-4 transition-all"
            style={{
              border: "1.5px solid rgba(212,168,67,0.45)",
              background: "rgba(212,168,67,0.07)",
              boxShadow: "0 0 0 0px rgba(212,168,67,0)",
            }}
          >
            <MapPin className="h-[22px] w-[22px] shrink-0 text-[#d4a843]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite 3 ou mais caracteres"
              className="flex-1 bg-transparent text-[17px] font-semibold text-[#f5f0e4] outline-none placeholder:font-normal placeholder:text-[#f5f0e4]/30"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {busy && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4a843] border-t-transparent" />
            )}
            {input && !busy && (
              <button
                type="button"
                onClick={reset}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#f5f0e4]/50 active:bg-white/18"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[760px]">

          {/* "Em breve" */}
          {noResults && !checking && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              {/* Ícone grande */}
              <div
                className="relative mb-6 grid h-[88px] w-[88px] place-items-center rounded-[24px]"
                style={{
                  border: "1.5px solid rgba(212,168,67,0.30)",
                  background: "linear-gradient(145deg, rgba(212,168,67,0.16), rgba(212,168,67,0.06))",
                  boxShadow: "0 20px 50px rgba(212,168,67,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <Clock className="h-9 w-9 text-[#d4a843]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] rounded-t-[24px] bg-[linear-gradient(90deg,transparent,#d4a843,transparent)]" />
              </div>

              <p
                className="text-[11px] font-black uppercase tracking-[0.22em]"
                style={{ color: "#d4a843" }}
              >
                Em breve
              </p>

              <h2
                className="mt-3 text-[28px] font-black leading-[1.1]"
                style={{
                  background: "linear-gradient(135deg, #fff8e8 0%, #f5f0e4 30%, #f5d78c 65%, #d4a843 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Terá acompanhantes<br />em {noResults}
              </h2>

              <p className="mt-4 max-w-[300px] text-[14px] leading-[1.75] text-[#f5f0e4]/48">
                Ainda não temos perfis verificados nessa cidade. Estamos crescendo — tente outra cidade por enquanto.
              </p>

              {/* Divider */}
              <div className="my-7 h-px w-16 bg-[#d4a843]/20" />

              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-[14px] px-7 py-3.5 text-[14px] font-bold text-[#f5d78c] active:opacity-80"
                style={{
                  border: "1.5px solid rgba(212,168,67,0.36)",
                  background: "rgba(212,168,67,0.12)",
                }}
              >
                <Search className="h-4 w-4" />
                Buscar outra cidade
              </button>
            </div>
          )}

          {/* Lista de sugestões */}
          {!noResults && !busy && suggestions.length > 0 && (
            <ul role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors active:bg-white/[0.04]"
                    style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]"
                      style={{
                        border: "1px solid rgba(212,168,67,0.22)",
                        background: "rgba(212,168,67,0.10)",
                      }}
                    >
                      <MapPin className="h-4.5 w-4.5 text-[#d4a843]" style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-[#f5f0e4]">{s.mainText}</p>
                      {s.secondaryText && (
                        <p className="truncate text-[12px] text-[#f5f0e4]/42">{s.secondaryText}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Placeholder inicial */}
          {!noResults && !busy && suggestions.length === 0 && !input && (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <div
                className="mb-5 grid h-16 w-16 place-items-center rounded-[18px]"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <MapPin className="h-7 w-7 text-[#f5f0e4]/18" />
              </div>
              <p className="text-[15px] font-semibold text-[#f5f0e4]/28">
                Digite o nome de uma cidade
              </p>
              <p className="mt-1.5 text-[13px] text-[#f5f0e4]/18">
                Mínimo 3 caracteres para buscar
              </p>
            </div>
          )}

          {/* Digitando mas ainda curto */}
          {!noResults && !busy && input.length > 0 && input.length < 3 && (
            <p className="px-4 py-8 text-center text-[14px] text-[#f5f0e4]/32">
              Continue digitando…
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
