"use client";

/* eslint-disable react-hooks/set-state-in-effect -- The modal intentionally resets transient search state every time it opens. */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { Clock, Crown, Diamond, LockKeyhole, MapPin, Search, ShieldCheck, X } from "lucide-react";

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
    if (!open) return;

    setInput("");
    setSuggestions([]);
    setNoResults(null);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 140);

    return () => clearTimeout(focusTimer);
  }, [open]);

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
    const city = suggestion.mainText;
    setChecking(true);
    setNoResults(null);

    try {
      const res = await fetch(`/api/professionals?city=${encodeURIComponent(city)}&limit=1`);
      const data = (await res.json()) as { total?: number };

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
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#030405] text-white"
      style={{ animation: "premiumFadeUp 200ms ease-out both" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_28%,rgba(250,204,21,0.10),transparent_32%),linear-gradient(180deg,#050505_0%,#030405_56%,#050505_100%)]" />

      <div className="relative mx-auto flex min-h-dvh max-w-[820px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+38px)] pt-[calc(env(safe-area-inset-top)+22px)] sm:px-8">
        <header className="flex items-center justify-between">
          <span className="text-[30px] font-black leading-none tracking-[-0.04em]">
            <span className="bg-[linear-gradient(135deg,#ffb326_0%,#facc15_48%,#fff0b5_100%)] bg-clip-text text-transparent">elite</span>
            <span className="text-[#fffaf0]">modell</span>
            <span className="ml-1 text-[#facc15]">✦</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-[66px] w-[66px] place-items-center rounded-[14px] border border-[#facc15]/35 bg-[#181307]/65 text-[#facc15] shadow-[0_0_28px_rgba(250,204,21,0.12)] transition hover:bg-[#241a08] active:scale-95"
            aria-label="Fechar"
          >
            <X className="h-9 w-9" strokeWidth={2.35} />
          </button>
        </header>

        <section className="relative mt-[66px] min-h-[298px] overflow-visible">
          <div className="pointer-events-none absolute -right-[72px] -top-[228px] h-[604px] w-[302px] sm:-right-[96px] sm:-top-[326px] sm:h-[820px] sm:w-[410px]" aria-hidden="true">
            <Image
              src="/brand/elite-modell%20gps.png"
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 302px, 410px"
              className="object-contain"
            />
          </div>
          <div className="pointer-events-none absolute -right-8 top-[116px] h-48 w-[78%] bg-[linear-gradient(90deg,#030405_0%,rgba(3,4,5,0.78)_38%,rgba(3,4,5,0)_100%)] sm:hidden" />

          <p className="relative text-[21px] font-black uppercase leading-none tracking-[0.34em] text-[#cfa243] sm:text-[16px]">EXPLORAR PERFIS</p>
          <h1 className="relative mt-6 text-[64px] font-black leading-[0.98] tracking-[-0.04em] text-[#fffaf0] [text-shadow:0_8px_34px_rgba(0,0,0,0.78)] sm:text-[72px]">
            Selecionar<br />cidade <span className="text-[#facc15]">✦</span>
          </h1>
          <p className="relative mt-5 text-[28px] leading-[1.32] text-[#d8d8d8] sm:text-[24px]">
            Escolha uma cidade para ver<br />os perfis disponíveis
          </p>
        </section>

        <section className="relative mt-[28px]">
          <div className="flex h-[94px] items-center rounded-[14px] border border-[#c89422]/85 bg-[#07090a]/92 shadow-[0_0_0_1px_rgba(250,204,21,0.08),0_22px_60px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.045)] transition focus-within:border-[#facc15] focus-within:shadow-[0_0_0_1px_rgba(250,204,21,0.20),0_0_34px_rgba(250,204,21,0.11)]">
            <div className="grid h-full w-[86px] shrink-0 place-items-center rounded-l-[13px] border-r border-[#c89422]/30 bg-[#17130c]/82">
              <MapPin className="h-12 w-12 text-[#f5b936] drop-shadow-[0_0_16px_rgba(250,204,21,0.35)]" strokeWidth={2.2} />
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
              className="min-w-0 flex-1 bg-transparent px-5 text-[29px] font-semibold text-[#fffaf0] outline-none placeholder:font-normal placeholder:text-[#8b8b8b] sm:text-[23px]"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="grid w-[74px] shrink-0 place-items-center">
              {busy ? (
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#facc15] border-t-transparent" />
              ) : input ? (
                <button
                  type="button"
                  onClick={reset}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-[#facc15] transition active:bg-white/14"
                  aria-label="Limpar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <Search className="h-10 w-10 text-[#f5b936]" strokeWidth={2.2} />
              )}
            </div>
          </div>
        </section>

        <main className="relative mt-[74px] flex-1">
          {noResults && !checking && (
            <div className="flex flex-col items-center rounded-[18px] border border-[#facc15]/20 bg-white/[0.035] px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mb-6 grid h-[88px] w-[88px] place-items-center rounded-[24px] border border-[#facc15]/35 bg-[#17130c]/82 shadow-[0_0_46px_rgba(250,204,21,0.14)]">
                <Clock className="h-9 w-9 text-[#facc15]" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#facc15]">Em breve</p>
              <h2 className="mt-3 text-[28px] font-black leading-[1.1] text-[#fffaf0]">
                Terá acompanhantes<br />em {noResults}
              </h2>
              <p className="mt-4 max-w-[330px] text-[15px] leading-[1.7] text-[#fffaf0]/55">
                Ainda não temos perfis verificados nessa cidade. Estamos crescendo, tente outra cidade por enquanto.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-8 flex min-h-12 items-center gap-2 rounded-[14px] border border-[#facc15]/45 bg-[#facc15]/14 px-7 text-[14px] font-bold text-[#facc15] transition active:scale-95"
              >
                <Search className="h-4 w-4" />
                Buscar outra cidade
              </button>
            </div>
          )}

          {!noResults && !busy && suggestions.length > 0 && (
            <ul className="overflow-hidden rounded-[18px] border border-[#facc15]/18 bg-white/[0.035]" role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
                    style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] border border-[#facc15]/26 bg-[#17130c]/88">
                      <MapPin className="h-5 w-5 text-[#facc15]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-black text-[#fffaf0]">{s.mainText}</p>
                      {s.secondaryText && <p className="mt-1 truncate text-[13px] text-[#fffaf0]/48">{s.secondaryText}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!noResults && !busy && suggestions.length === 0 && (
            <div className="space-y-[44px]">
              <PremiumInvite />
              <div className="space-y-8 px-4">
                <TrustLine
                  icon={<ShieldCheck className="h-7 w-7" />}
                  title="Ambiente seguro e verificado"
                  description="Seus dados estão protegidos conosco."
                />
                <div className="h-px bg-white/10" />
                <TrustLine
                  icon={<LockKeyhole className="h-7 w-7" />}
                  title="Privacidade garantida"
                  description="Informações 100% seguras."
                />
              </div>
              {input.length > 0 && input.length < 3 && (
                <p className="text-center text-[14px] font-semibold text-[#fffaf0]/38">Continue digitando...</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PremiumInvite() {
  return (
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
  );
}

function TrustLine({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-5">
      <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[16px] bg-[#17130c]/88 text-[#facc15]">
        {icon}
      </div>
      <div>
        <h3 className="text-[18px] font-black text-[#fffaf0]">{title}</h3>
        <p className="mt-2 text-[16px] leading-snug text-[#fffaf0]/58">{description}</p>
      </div>
    </div>
  );
}
