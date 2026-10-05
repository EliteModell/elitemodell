"use client";

/* eslint-disable react-hooks/set-state-in-effect -- The selector resets transient search state when opened. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Crown, Diamond, LockKeyhole, MapPin, Navigation2, Search, ShieldCheck, X } from "lucide-react";
import PremiumUpsellModal from "@/components/premium/PremiumUpsellModal";

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type GeoResult = {
  city?: string;
  state?: string;
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
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setInput("");
    setSuggestions([]);
    setNoResults(null);
  }, []);

  useEffect(() => {
    function syncVisualViewport() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--elite-visual-viewport-height", `${height}px`);
      document.body.dataset.cityKeyboardOpen =
        window.visualViewport && window.innerHeight - window.visualViewport.height > 120 ? "true" : "false";
    }

    syncVisualViewport();
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);

    return () => {
      delete document.body.dataset.cityKeyboardOpen;
      document.documentElement.style.removeProperty("--elite-visual-viewport-height");
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
    };
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (input.length < 2) {
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
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [input]);

  async function handleSelect(suggestion: Suggestion) {
    const selectedCity = suggestion.mainText;
    setChecking(true);
    setNoResults(null);
    onSelectCity(selectedCity);
    setChecking(false);
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("Localização não disponível neste dispositivo. Digite sua cidade abaixo.");
      return;
    }

    setGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/address/geocode?latlng=${latitude},${longitude}`);
          const data = (await res.json()) as GeoResult;
          if (data.city) {
            onSelectCity(data.city);
          } else {
            setGeoError("Não conseguimos identificar sua cidade. Digite manualmente abaixo.");
          }
        } catch {
          setGeoError("Erro ao obter localização. Digite sua cidade abaixo.");
        } finally {
          setGeolocating(false);
        }
      },
      (err) => {
        setGeolocating(false);
        if (err.code === 1) {
          setGeoError("Permissão de localização negada. Digite sua cidade abaixo.");
        } else {
          setGeoError("Não conseguimos sua localização. Digite sua cidade abaixo.");
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  function reset() {
    setInput("");
    setSuggestions([]);
    setNoResults(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function handleCityFocus() {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  }

  const busy = loadingSuggestions || checking;
  const visibleSuggestions = input.length >= 2 ? suggestions : [];

  return (
    <>
      <div className="client-city-select">
      <div className="client-city-bg" />

      <div className="client-city-wrap">
        <header className="client-city-header">
          <span className="client-city-logo" aria-label="Elite Modell">
            <Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={2172} height={724} priority style={{ width: 174, height: "auto", objectFit: "contain", opacity: 1, filter: "none" }} />
          </span>
          <button type="button" onClick={onClose} className="client-city-close" aria-label="Fechar">
            <X />
          </button>
        </header>

        <section className="client-city-hero">
          <p className="client-city-kicker">EXPLORAR PERFIS</p>
          <h1 className="client-city-title">
            Escolha sua<br /><span>cidade</span>
          </h1>
          <p className="client-city-subtitle">
            Use sua localização ou<br />digite a cidade para buscar perfis
          </p>
          <Image
            src="/images/client/model-client-premium.jpeg"
            alt=""
            width={1066}
            height={559}
            priority
            sizes="(max-width: 430px) 78vw, 340px"
            className="client-city-hero-image"
          />
        </section>

        {/* Geolocation button */}
        <section className="px-4 pb-2">
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geolocating}
            className="client-city-location-button"
          >
            {geolocating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e1a6ff]/30 border-t-[#e1a6ff]" />
            ) : (
              <Navigation2 className="h-4 w-4" />
            )}
            {geolocating ? "Buscando sua localização..." : "Usar minha localização"}
          </button>

          {geoError && (
            <p className="mt-2.5 rounded-[10px] bg-[#f87171]/10 px-3 py-2 text-center text-[12px] text-[#f87171]">
              {geoError}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#f5f0e4]/36">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
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
              placeholder="Digite sua cidade..."
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

          {!noResults && !busy && visibleSuggestions.length > 0 && (
            <ul className="client-city-suggestions" role="listbox">
              {visibleSuggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(s)}
                    style={{ borderBottom: i < visibleSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
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

          {!noResults && !busy && visibleSuggestions.length === 0 && input.length >= 2 && (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <Search className="h-8 w-8 text-[#f5f0e4]/28" />
              <p className="text-[14px] text-[#f5f0e4]/50">Nenhuma sugestão para &ldquo;{input}&rdquo;</p>
              <p className="text-[12px] text-[#f5f0e4]/36">Tente escrever com mais letras ou verifique o nome.</p>
            </div>
          )}

          {!noResults && !busy && visibleSuggestions.length === 0 && input.length < 2 && (
            <div className="space-y-[44px]">
              <div className="client-city-intro-card">
                <div>
                  <Diamond />
                </div>
                <div>
                  <h2>Disponível para iniciantes</h2>
                  <p>
                    Explore acompanhantes na sua cidade com segurança e discrição.
                  </p>
                  <button type="button" onClick={() => setPremiumOpen(true)} className="flex min-h-[54px] w-full client-city-premium-button">
                    Seja Premium
                    <Crown />
                  </button>
                </div>
              </div>
              <div className="client-city-trust-list">
                <div>
                  <div><ShieldCheck /></div>
                  <div>
                    <h3>Ambiente seguro e verificado</h3>
                    <p>Seus dados estão protegidos conosco.</p>
                  </div>
                </div>
                <div>
                  <div><LockKeyhole /></div>
                  <div>
                    <h3>Privacidade garantida</h3>
                    <p>Informações 100% seguras.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        </div>
      </div>
      <PremiumUpsellModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        featureLabel="os benefícios da área de clientes Premium"
        returnTo="/dashboard/acompanhantes"
      />
    </>
  );
}
