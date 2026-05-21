"use client";

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
        const data = (await res.json()) as { suggestions?: Suggestion[] };
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
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#030405] text-[#f7f1e4]"
      style={{ animation: "premiumFadeUp 200ms ease-out both" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_76%_20%,rgba(220,158,38,0.10),transparent_28%),linear-gradient(180deg,#050607_0%,#020303_100%)]" />

      <div className="relative mx-auto flex min-h-dvh max-w-[820px] flex-col px-[38px] pb-[calc(env(safe-area-inset-bottom)+34px)] pt-[calc(env(safe-area-inset-top)+30px)] sm:px-8">
        <header className="flex items-center justify-between">
          <span className="text-[22px] font-black leading-none tracking-tight sm:text-[24px]">
            <span className="bg-[linear-gradient(135deg,#ffb326_0%,#f7d67d_48%,#fff5dc_100%)] bg-clip-text text-transparent">elite</span>
            <span className="text-[#fffaf0]">modell</span>
            <span className="ml-1 text-[#f6bb37]">✦</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-[66px] w-[66px] place-items-center rounded-[14px] border border-[#d4a843]/45 bg-[#181307]/58 text-[#f7b733] shadow-[0_0_28px_rgba(212,168,67,0.13)] transition active:scale-95 active:bg-[#241a08] sm:h-[58px] sm:w-[58px]"
            aria-label="Fechar"
          >
            <X className="h-9 w-9 sm:h-8 sm:w-8" strokeWidth={2.4} />
          </button>
        </header>

        <section className="relative mt-[72px] min-h-[288px] overflow-visible pb-3 sm:mt-14 sm:min-h-[330px]">
          <div
            className="pointer-events-none absolute -right-[68px] -top-[208px] h-[570px] w-[285px] sm:-right-[90px] sm:-top-[300px] sm:h-[790px] sm:w-[395px]"
            aria-hidden="true"
          >
            <Image
              src="/brand/elite-modell%20gps.png"
              alt=""
              fill
              sizes="(max-width: 640px) 285px, 395px"
              className="object-contain"
            />
          </div>
          <div className="pointer-events-none absolute -right-10 top-[120px] h-44 w-[78%] bg-[linear-gradient(90deg,#030405_0%,rgba(3,4,5,0.76)_36%,rgba(3,4,5,0)_100%)] sm:hidden" />

          <p className="relative text-[22px] font-black uppercase leading-none tracking-[0.32em] text-[#d8ad4a] sm:text-[15px]">Explorar perfis</p>
          <h1 className="relative mt-6 max-w-[360px] text-[64px] font-black leading-[0.98] tracking-tight text-[#fffaf0] [text-shadow:0_8px_30px_rgba(0,0,0,0.70)] sm:text-[70px]">
            Selecionar<br />cidade <span className="text-[#f4b735]">✦</span>
          </h1>
          <p className="relative mt-5 max-w-[360px] text-[29px] leading-[1.38] text-[#fffaf0]/72 sm:text-[24px]">
            Escolha uma cidade para ver os perfis disponíveis
          </p>
        </section>

        <section className="relative mt-[18px]">
          <div className="flex h-[94px] items-center rounded-[14px] border border-[#d4a843]/80 bg-[#07090a]/90 shadow-[0_0_0_1px_rgba(245,215,140,0.08),0_22px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid h-full w-[86px] shrink-0 place-items-center rounded-l-[13px] border-r border-[#d4a843]/28 bg-[#17130c]/82">
              <MapPin className="h-12 w-12 text-[#f7b733] drop-shadow-[0_0_16px_rgba(247,183,51,0.45)]" strokeWidth={2.2} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite 3 ou mais caracteres"
              className="min-w-0 flex-1 bg-transparent px-5 text-[29px] font-semibold text-[#fffaf0] outline-none placeholder:font-normal placeholder:text-[#fffaf0]/38 sm:text-[23px]"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="grid w-[74px] shrink-0 place-items-center">
              {busy ? (
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#f7b733] border-t-transparent" />
              ) : input ? (
                <button
                  type="button"
                  onClick={reset}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-[#f7b733] active:bg-white/14"
                  aria-label="Limpar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <Search className="h-10 w-10 text-[#f7b733] sm:h-8 sm:w-8" strokeWidth={2.2} />
              )}
            </div>
          </div>
        </section>

        <main className="relative mt-[74px] flex-1">
          {noResults && !checking && (
            <div className="flex flex-col items-center rounded-[18px] border border-[#d4a843]/20 bg-white/[0.035] px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mb-6 grid h-[88px] w-[88px] place-items-center rounded-[24px] border border-[#d4a843]/35 bg-[#17130c]/82 shadow-[0_0_46px_rgba(212,168,67,0.16)]">
                <Clock className="h-9 w-9 text-[#f7b733]" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Em breve</p>
              <h2 className="mt-3 text-[28px] font-black leading-[1.1] text-[#fffaf0]">
                Terá acompanhantes<br />em {noResults}
              </h2>
              <p className="mt-4 max-w-[330px] text-[15px] leading-[1.7] text-[#fffaf0]/55">
                Ainda não temos perfis verificados nessa cidade. Estamos crescendo, tente outra cidade por enquanto.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-8 flex min-h-12 items-center gap-2 rounded-[14px] border border-[#d4a843]/45 bg-[#d4a843]/14 px-7 text-[14px] font-bold text-[#f7c75d] active:scale-95"
              >
                <Search className="h-4 w-4" />
                Buscar outra cidade
              </button>
            </div>
          )}

          {!noResults && !busy && suggestions.length > 0 && (
            <ul className="overflow-hidden rounded-[18px] border border-[#d4a843]/18 bg-white/[0.035]" role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors active:bg-white/[0.06]"
                    style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] border border-[#d4a843]/26 bg-[#17130c]/88">
                      <MapPin className="h-5 w-5 text-[#f7b733]" />
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
            <div className="space-y-8">
              <PremiumInvite />
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
        <Diamond className="h-12 w-12 text-[#f7b733]" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[21px] font-black leading-tight text-[#f7c75d] sm:text-[24px]">Encontre perfis exclusivos</h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-[#fffaf0]/60 sm:text-[18px]">
          Explore modelos e talentos na sua cidade com recursos premium.
        </p>
      </div>
      <button
        type="button"
        className="flex min-h-[58px] shrink-0 items-center gap-3 rounded-[12px] border border-[#d4a843]/55 bg-[linear-gradient(135deg,rgba(247,183,51,0.36),rgba(104,74,18,0.78))] px-5 text-[15px] font-black text-[#ffd36d] shadow-[0_0_34px_rgba(212,168,67,0.16)] active:scale-95 sm:px-7 sm:text-[16px]"
      >
        Seja Premium
        <Crown className="h-5 w-5 fill-[#ffd36d]/30" />
      </button>
    </div>
  );
}

function TrustLine({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-5 px-4">
      <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[16px] bg-[#17130c]/88 text-[#f7b733]">
        {icon}
      </div>
      <div>
        <h3 className="text-[18px] font-black text-[#fffaf0]">{title}</h3>
        <p className="mt-2 text-[16px] leading-snug text-[#fffaf0]/58">{description}</p>
      </div>
    </div>
  );
}
