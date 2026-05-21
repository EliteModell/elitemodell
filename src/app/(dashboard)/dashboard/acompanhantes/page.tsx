"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Camera,
  ChevronDown,
  ChevronRight,
  Crown,
  Diamond,
  Grid2X2,
  LockKeyhole,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  VenusAndMars,
  X,
} from "lucide-react";

type Professional = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  city: string;
  state: string;
  image?: string | null;
  priceMin?: number | null;
  pricePerHour?: number | null;
  escortCategory?: string | null;
  rating: number;
  totalReviews: number;
  verified: boolean;
  featured: boolean;
  photos: { id: string; url: string; cover: boolean }[];
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

const CATEGORIES = [
  { value: "", label: "Todas", icon: <Grid2X2 className="h-4 w-4" /> },
  { value: "MULHER", label: "Mulheres", icon: <UserRound className="h-4 w-4" /> },
  { value: "HOMEM", label: "Homens", icon: <UserRound className="h-4 w-4" /> },
  { value: "TRANS", label: "Trans", icon: <VenusAndMars className="h-4 w-4" /> },
];

function CategoryIcon({ value }: { value: string }) {
  if (value === "TRANS") return <VenusAndMars className="h-4 w-4" />;
  if (value) return <UserRound className="h-4 w-4" />;
  return <Grid2X2 className="h-4 w-4" />;
}

function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#101214]">
      <div className="premium-skeleton h-[250px] w-full" />
      <div className="space-y-2 px-4 py-3">
        <div className="premium-skeleton h-4 w-[52%] rounded-full" />
        <div className="premium-skeleton h-3.5 w-[36%] rounded-full" />
      </div>
      <div className="flex gap-2.5 px-4 pb-4">
        <div className="premium-skeleton h-10 flex-1 rounded-[8px]" />
        <div className="premium-skeleton h-10 w-[104px] rounded-[8px]" />
      </div>
    </div>
  );
}

function ProfessionalCard({ p }: { p: Professional }) {
  const cover = p.photos?.find((ph) => ph.cover)?.url ?? p.image ?? null;
  const price = p.pricePerHour ?? p.priceMin;
  const isOnline = p.featured || p.rating >= 4.7;

  return (
    <article className="client-profile-card">
      <div className="relative h-[250px] w-full overflow-hidden bg-[#17191b]">
        {cover ? (
          <img src={cover} alt={p.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#141618]">
            <Camera className="h-12 w-12 text-[#f5f0e4]/18" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-1.5">
          {isOnline ? (
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-bold text-[#5ede6d] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#5ede6d]" />
              Online
            </span>
          ) : p.verified ? (
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[11px] font-semibold text-[#7ed58a] backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verificada
            </span>
          ) : null}
          {p.featured && (
            <span className="rounded-full bg-[#d4a843] px-2.5 py-1 text-[11px] font-bold text-[#0d1318]">
              Destaque
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[19px] font-bold leading-tight text-white">{p.displayName}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-white/50" />
                <span className="truncate text-[12px] text-white/65">
                  {p.city}, {p.state}
                </span>
              </div>
            </div>
            {price ? (
              <div className="shrink-0 rounded-[6px] border border-[#d4a843]/28 bg-black/75 px-2.5 py-1.5 backdrop-blur-sm">
                <p className="text-[13px] font-bold text-[#f5d78c]">
                  {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/[0.05] px-4 py-2.5">
        {p.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#7ed58a]" />}
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#d4a843] text-[#d4a843]" />
          <span className="text-[13px] font-bold text-[#f5f0e4]">{p.rating.toFixed(1)}</span>
          <span className="text-[12px] text-[#f5f0e4]/36">({p.totalReviews})</span>
        </div>
        {p.bio ? (
          <p className="ml-auto line-clamp-1 min-w-0 max-w-[150px] text-right text-[12px] text-[#f5f0e4]/40">
            {p.bio}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2.5 px-4 pb-4">
        <Link
          href={`/profissionais/${p.slug}`}
          className="client-secondary-button flex min-h-0 flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold no-underline"
        >
          Ver perfil
          <ChevronRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          className="client-primary-button flex min-h-0 items-center gap-1.5 px-4 py-2.5 text-[13px]"
        >
          <Phone className="h-4 w-4" />
          Contato
        </button>
      </div>
    </article>
  );
}

function FilterDrawer({
  open,
  onClose,
  sortBy,
  onSortBy,
  onlyVerified,
  onOnlyVerified,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  sortBy: string;
  onSortBy: (v: string) => void;
  onlyVerified: boolean;
  onOnlyVerified: (v: boolean) => void;
  onClear: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="client-filter-overlay" role="dialog" aria-modal="true" aria-label="Filtrar perfis">
      <button type="button" className="client-filter-backdrop" onClick={onClose} aria-label="Fechar filtros" />
      <section data-client-filter-panel="true" className="client-filter-panel">
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#f5b83b]/28" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="client-filter-title">Filtrar perfis</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="client-filter-close"
            aria-label="Fechar filtros"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="client-filter-label">Ordenar por</p>
            <div className="client-filter-options">
              {[
                { value: "rating", label: "Mais avaliados" },
                { value: "price_asc", label: "Menor preço" },
                { value: "price_desc", label: "Maior preço" },
                { value: "recent", label: "Mais recentes" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onSortBy(s.value)}
                  className={`client-filter-option ${sortBy === s.value ? "active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="client-filter-label">Mídia disponível</p>
            <div className="client-filter-options">
              {["Com fotos", "Com vídeos", "Com shots"].map((label) => (
                <button key={label} type="button" className="client-filter-option disabled" disabled>
                  {label}
                  <span>Em breve</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="client-filter-label">Verificação</p>
            <div className="client-filter-toggle-row">
              <div className="min-w-0">
                <p>Somente verificadas</p>
                <span>Perfis com identidade confirmada</span>
              </div>
              <button
                type="button"
                className={`client-filter-toggle ${onlyVerified ? "active" : ""}`}
                onClick={() => onOnlyVerified(!onlyVerified)}
                aria-pressed={onlyVerified}
                aria-label="Somente verificadas"
              >
                <span />
              </button>
            </div>
            <div className="client-filter-options mt-3">
              {["Perfil com documento confirmado", "Perfil com foto verificada"].map((label) => (
                <button key={label} type="button" className="client-filter-option disabled" disabled>
                  {label}
                  <span>Em breve</span>
                </button>
              ))}
            </div>
          </div>

          {[
            ["Disponibilidade", ["Disponível agora", "Atendimento hoje", "Online recentemente"]],
            ["Atendimento", ["Com local", "Atende em hotel", "Atende em domicílio", "Viagem / deslocamento"]],
            ["Faixa de preço", ["Até R$ 200", "R$ 200 a R$ 400", "R$ 400+"]],
            ["Características", ["Novas na plataforma", "Mais curtidas", "Perfil premium", "Com descrição completa"]],
          ].map(([title, options]) => (
            <div key={String(title)}>
              <p className="client-filter-label">{String(title)}</p>
              <div className="client-filter-options">
                {(options as string[]).map((label) => (
                  <button key={label} type="button" className="client-filter-option disabled" disabled>
                    {label}
                    <span>Em breve</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="client-filter-actions">
          <button type="button" onClick={onClear} className="client-filter-clear">
            Limpar filtros
          </button>
          <button type="button" onClick={onClose} className="client-primary-button w-full text-[16px]">
            Aplicar filtros
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

const SORT_LABELS: Record<string, string> = {
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  recent: "Mais recentes",
};

function EmptyState({
  hasFilters,
  activeCategory,
  sortBy,
  onClear,
  onExploreCity,
}: {
  hasFilters: boolean;
  activeCategory: string;
  sortBy: string;
  onClear: () => void;
  onExploreCity: () => void;
}) {
  const activeTags = [
    activeCategory ? CATEGORIES.find((c) => c.value === activeCategory)?.label : null,
    sortBy !== "rating" ? SORT_LABELS[sortBy] : null,
  ].filter(Boolean) as string[];

  return (
    <section className="client-empty mb-16 mt-1 overflow-hidden pb-36 pt-12">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="grid h-[68px] w-[68px] place-items-center rounded-[16px] border border-[#d4a843]/26 bg-[#d4a843]/12 text-[#f5d78c] shadow-[0_14px_36px_rgba(212,168,67,0.14)]">
          {hasFilters ? <Search className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <p className="mt-6 text-[11px] font-black uppercase text-[#f5d78c]/82">
          {hasFilters ? "Sem resultado" : "Perfis verificados"}
        </p>
        <h2 className="mt-2 max-w-[330px] text-[30px] font-black leading-tight text-[#f5f0e4]">
          {hasFilters ? "Nenhum perfil encontrado" : "Escolha uma cidade para ver os perfis"}
        </h2>
        {activeTags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#d4a843]/28 bg-[#d4a843]/12 px-3 py-1 text-[11px] font-bold uppercase text-[#f5d78c]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="mt-4 max-w-[320px] text-[15px] leading-7 text-[#f5f0e4]/56">
          {hasFilters
            ? "Tente remover alguns filtros ou buscar por outra cidade."
            : "Quando houver perfis ativos e verificados, eles aparecem aqui com foto, cidade e contato."}
        </p>
        <div className="mt-8 flex w-full max-w-[330px] flex-col gap-3">
          <button
            type="button"
            onClick={hasFilters ? onClear : onExploreCity}
            className="client-primary-button flex min-h-0 items-center justify-center gap-2 py-3.5 text-[15px] font-black"
          >
            {hasFilters ? "Limpar filtros" : "Explorar cidades"}
            <ChevronRight className="h-4 w-4" />
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={onExploreCity}
              className="client-secondary-button flex min-h-0 items-center justify-center gap-2 py-3.5 text-[15px] font-black"
            >
              <MapPin className="h-4 w-4" />
              Trocar cidade
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ExploreSafetyCard() {
  return (
    <section className="client-explore-safety">
      <div>
        <span>
          <ShieldCheck />
        </span>
        <div>
          <h3>Ambiente seguro e verificado</h3>
          <p>Seus dados estão protegidos.</p>
        </div>
      </div>
      <div>
        <span>
          <LockKeyhole />
        </span>
        <div>
          <h3>Privacidade garantida</h3>
          <p>Informações 100% seguras.</p>
        </div>
      </div>
    </section>
  );
}

function CitySelectionScreen({
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
    const selectedCity = suggestion.mainText;
    setChecking(true);
    setNoResults(null);

    try {
      const res = await fetch(`/api/professionals?city=${encodeURIComponent(selectedCity)}&limit=1`);
      const data = (await res.json()) as { total?: number };

      if ((data.total ?? 0) > 0) {
        onSelectCity(selectedCity);
      } else {
        setNoResults(selectedCity);
      }
    } catch {
      onSelectCity(selectedCity);
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
            <span className="ml-1 text-[#facc15]">✦</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="client-city-close"
            aria-label="Fechar"
          >
            <X />
          </button>
        </header>

        <section className="client-city-hero">
          <Image
            src="/brand/elite-modell%20gps.png"
            alt=""
            width={640}
            height={520}
            priority
            sizes="(max-width: 430px) 100vw, 320px"
            className="client-city-hero-image"
          />

          <p className="client-city-kicker">EXPLORAR PERFIS</p>
          <h1 className="client-city-title">
            Selecionar<br />cidade <span className="text-[#facc15]">✦</span>
          </h1>
          <p className="client-city-subtitle">
            Escolha uma cidade para ver<br />os perfis disponíveis
          </p>
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
                <button
                  type="button"
                  onClick={reset}
                  className="client-city-clear"
                  aria-label="Limpar busca"
                >
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
              <button
                type="button"
                onClick={reset}
              >
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

export default function AcompanhantesPage() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") ?? "";
  const appliedInitial = useRef(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [city, setCity] = useState(initialCity);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    if (appliedInitial.current) {
      setCity(initialCity);
    }
    appliedInitial.current = true;
  }, [initialCity]);

  const fetchMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (activeCategory) qs.set("category", activeCategory);
      if (city) qs.set("city", city);
      if (sortBy) qs.set("sortBy", sortBy);
      if (onlyVerified) qs.set("verified", "true");
      qs.set("page", String(nextPage));
      qs.set("limit", "12");
      const res = await fetch(`/api/professionals?${qs}`);
      const data = await res.json();
      const list: Professional[] = Array.isArray(data.professionals) ? data.professionals : [];
      setProfessionals((prev) => [...prev, ...list]);
      setPage(nextPage);
      setHasMore(nextPage < (data.pages ?? 1));
    } catch {
      /* keep current list */
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, city, sortBy, onlyVerified, page]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!city && !search && !activeCategory && !onlyVerified && sortBy === "rating") {
        setProfessionals([]);
        setTotal(0);
        setHasMore(false);
        setPage(1);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (search) qs.set("search", search);
        if (activeCategory) qs.set("category", activeCategory);
        if (city) qs.set("city", city);
        if (sortBy) qs.set("sortBy", sortBy);
        if (onlyVerified) qs.set("verified", "true");
        qs.set("page", "1");
        qs.set("limit", "12");
        const res = await fetch(`/api/professionals?${qs}`, { signal: controller.signal });
        const data = await res.json();
        const list: Professional[] = Array.isArray(data.professionals) ? data.professionals : [];
        setProfessionals(list);
        setPage(1);
        setTotal(data.total ?? list.length);
        setHasMore(1 < (data.pages ?? 1));
      } catch {
        if (!controller.signal.aborted) setProfessionals([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [search, activeCategory, city, sortBy, onlyVerified]);

  useEffect(() => {
    if (filterOpen) {
      document.body.dataset.clientFiltersOpen = "true";
    } else {
      delete document.body.dataset.clientFiltersOpen;
    }

    return () => {
      delete document.body.dataset.clientFiltersOpen;
    };
  }, [filterOpen]);

  useEffect(() => {
    document.body.dataset.clientExplore = "true";
    return () => {
      delete document.body.dataset.clientExplore;
    };
  }, []);

  const hasFilters = Boolean(search || activeCategory || city || onlyVerified || sortBy !== "rating");

  function clearFilters() {
    setSearch("");
    setActiveCategory("");
    setCity("");
    setOnlyVerified(false);
    setSortBy("rating");
  }

  function focusCity() {
    document.querySelector<HTMLInputElement>('[data-client-city-filter="true"]')?.focus();
  }

  const activeFilterLabels = [
    search ? `Busca: ${search}` : null,
    activeCategory ? CATEGORIES.find((c) => c.value === activeCategory)?.label : null,
    city ? city : null,
    sortBy !== "rating" ? SORT_LABELS[sortBy] : null,
    onlyVerified ? "Verificadas" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <section className="client-explore-home">
        <div>
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#f5c242]">EXPLORAR PERFIS</p>
          <h1 className="mt-2 text-[40px] font-black leading-[1.04] tracking-[-0.03em] text-white">
            Perfis <span className="text-[#f5c242]">verificados</span><br />perto de você
          </h1>
          <p className="mt-2 max-w-[360px] text-[15px] leading-6 text-[#9ca3af]">
            Encontre acompanhantes verificados na sua cidade com segurança e discrição.
          </p>
        </div>

        <div className="relative mx-[-8px] mt-6 h-80 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f1012] shadow-[0_25px_80px_rgba(0,0,0,0.40)]">
          <Image
            src="/brand/elite%20modell%20explorar.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 760px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.18)_44%,rgba(0,0,0,0.82)_100%)]" />
        </div>

        <div className="relative z-10 -mt-6 rounded-[28px] border border-white/[0.10] bg-white/[0.055] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-black uppercase text-[#f5c242]">BUSCA</h2>
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className="flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-[#1f2227] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2a2d33] active:scale-[0.985]"
            >
              Filtros avançados
              <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="client-explore-field-label">Cidade</span>
              <div className="flex min-h-[54px] items-center gap-3 rounded-[18px] border border-white/[0.10] bg-[#111318] px-4 shadow-[0_0_26px_rgba(245,194,66,0.04)] transition focus-within:border-[#f5c242] focus-within:shadow-[0_0_0_3px_rgba(245,194,66,0.12)]">
                <MapPin className="h-5 w-5 shrink-0 text-[#f5c242]" />
                <input
                  type="text"
                  placeholder="Digite a cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none placeholder:text-white/38"
                  data-client-city-filter="true"
                />
              </div>
            </label>

            <label className="block">
              <span className="client-explore-field-label">O que você procura?</span>
              <div className="flex min-h-[54px] items-center gap-3 rounded-[18px] border border-white/[0.10] bg-[#111318] px-4 shadow-[0_0_26px_rgba(245,194,66,0.04)] transition focus-within:border-[#f5c242] focus-within:shadow-[0_0_0_3px_rgba(245,194,66,0.12)]">
                <Search className="h-5 w-5 shrink-0 text-[#f5c242]" />
                <input
                  type="text"
                  placeholder="Ex.: loira, morena, universitária..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none placeholder:text-white/38"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 transition active:scale-95"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[15px] font-black uppercase text-[#f5c242]">CATEGORIA</p>
          <div className="category-scroll">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setActiveCategory(c.value);
                }}
                className={`category-button ${activeCategory === c.value ? "active" : ""}`}
              >
                <CategoryIcon value={c.value} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

          {hasFilters && (
            <div className="mt-4 rounded-[18px] border border-[#f5c242]/18 bg-[#f5c242]/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[13px] font-semibold text-white/72">
                  Busca personalizada ativa
                </span>
                <button type="button" onClick={clearFilters} className="shrink-0 text-[13px] font-black text-[#f5c242]">
                  Limpar
                </button>
              </div>
              {activeFilterLabels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <span key={label} className="rounded-full border border-[#f5c242]/18 bg-black/20 px-2.5 py-1 text-[11px] font-bold text-[#f5f0e4]/72">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
      </section>

      {!loading && professionals.length > 0 && (
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-[13px] text-[#f5f0e4]/48">{total} perfis encontrados</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-[12px] font-semibold text-[#f5d78c]">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sortBy={sortBy}
        onSortBy={setSortBy}
        onlyVerified={onlyVerified}
        onOnlyVerified={setOnlyVerified}
        onClear={clearFilters}
      />

      <div className="mt-1 space-y-12 px-5 pb-[calc(360px+env(safe-area-inset-bottom))]">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <ProfileCardSkeleton key={i} />)
        ) : professionals.length === 0 ? (
          <>
            <EmptyState hasFilters={hasFilters} activeCategory={activeCategory} sortBy={sortBy} onClear={clearFilters} onExploreCity={focusCity} />
            <ExploreSafetyCard />
          </>
        ) : (
          <>
            {professionals.map((p) => (
              <ProfessionalCard key={p.id} p={p} />
            ))}
            {loading && <ProfileCardSkeleton />}
            {hasMore && !loading && (
              <button
                type="button"
                onClick={() => void fetchMore()}
                className="client-secondary-button w-full py-3 text-[14px] font-semibold"
              >
                Ver mais
              </button>
            )}
            {!hasMore && professionals.length > 4 && (
              <p className="pb-2 text-center text-[12px] text-[#f5f0e4]/28">
                Voce viu todos os perfis disponiveis
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
