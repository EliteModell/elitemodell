"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ClientSensitiveAction } from "@/components/client-area/ClientSensitiveGate";
import CitySelectorScreen from "@/components/client-area/CitySelectorScreen";
import {
  BadgeCheck,
  Camera,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Heart,
  MapPin,
  Navigation2,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  VenusAndMars,
  X,
} from "lucide-react";

const CITY_STORAGE_KEY = "em_client_city";

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
  const [saved, setSaved] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  async function toggleFavorite() {
    if (savingFavorite) return;
    setSavingFavorite(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      const response = await fetch("/api/favorites/professionals", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId: p.id }),
      });
      if (!response.ok) throw new Error("favorite_failed");
    } catch {
      setSaved(!nextSaved);
    } finally {
      setSavingFavorite(false);
    }
  }

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
          onClick={() => void toggleFavorite()}
          className={`client-secondary-button grid min-h-0 w-11 place-items-center px-0 py-2.5 ${saved ? "text-[#f5d78c]" : ""}`}
          aria-pressed={saved}
          aria-label={saved ? "Remover dos favoritos" : "Salvar perfil"}
          disabled={savingFavorite}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>
        <ClientSensitiveAction className="client-primary-button flex min-h-0 items-center gap-1.5 px-4 py-2.5 text-[13px]">
          <Phone className="h-4 w-4" />
          Contato
        </ClientSensitiveAction>
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
  if (!open) return null;

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
          </div>

          {[
            ["Disponibilidade", ["Disponível agora", "Atendimento hoje", "Online recentemente"]],
            ["Atendimento", ["Com local", "Atende em hotel", "Atende em domicílio", "Viagem / deslocamento"]],
            ["Faixa de preço", ["Até R$ 200", "R$ 200 a R$ 400", "R$ 400+"]],
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
  city,
  hasFilters,
  activeCategory,
  sortBy,
  onClear,
  onChangeCity,
}: {
  city: string;
  hasFilters: boolean;
  activeCategory: string;
  sortBy: string;
  onClear: () => void;
  onChangeCity: () => void;
}) {
  const activeTags = [
    activeCategory ? CATEGORIES.find((c) => c.value === activeCategory)?.label : null,
    sortBy !== "rating" ? SORT_LABELS[sortBy] : null,
  ].filter(Boolean) as string[];

  if (!city) {
    return (
      <section className="client-empty mb-16 mt-1 pb-36 pt-12">
        <div className="flex flex-col items-center px-6 text-center">
          <div className="grid h-[68px] w-[68px] place-items-center rounded-[16px] border border-[#d4a843]/26 bg-[#d4a843]/12 text-[#f5d78c]">
            <MapPin className="h-8 w-8" />
          </div>
          <p className="mt-6 text-[11px] font-black uppercase text-[#f5d78c]/82">Localização</p>
          <h2 className="mt-2 max-w-[330px] text-[28px] font-black leading-tight text-[#f5f0e4]">
            Selecione uma cidade para ver os perfis
          </h2>
          <p className="mt-4 max-w-[300px] text-[15px] leading-7 text-[#f5f0e4]/56">
            Use o botão acima para escolher uma cidade ou usar sua localização.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="client-empty mb-16 mt-1 overflow-hidden pb-36 pt-12">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="grid h-[68px] w-[68px] place-items-center rounded-[16px] border border-[#d4a843]/26 bg-[#d4a843]/12 text-[#f5d78c] shadow-[0_14px_36px_rgba(212,168,67,0.14)]">
          {hasFilters ? <Search className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <p className="mt-6 text-[11px] font-black uppercase text-[#f5d78c]/82">
          {hasFilters ? "Sem resultado" : "Perfis verificados"}
        </p>
        <h2 className="mt-2 max-w-[330px] text-[28px] font-black leading-tight text-[#f5f0e4]">
          {hasFilters ? `Nenhum perfil encontrado em ${city}` : `Sem perfis em ${city} ainda`}
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
        <p className="mt-4 max-w-[300px] text-[15px] leading-7 text-[#f5f0e4]/56">
          {hasFilters
            ? "Tente remover alguns filtros ou buscar por outra cidade."
            : "Tente buscar em uma cidade próxima ou volte mais tarde."}
        </p>
        <div className="mt-8 flex w-full max-w-[330px] flex-col gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="client-primary-button flex min-h-0 items-center justify-center gap-2 py-3.5 text-[15px] font-black"
            >
              Limpar filtros
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onChangeCity}
            className="client-secondary-button flex min-h-0 items-center justify-center gap-2 py-3.5 text-[15px] font-black"
          >
            <MapPin className="h-4 w-4" />
            Buscar outra cidade
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AcompanhantesPage() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") ?? "";
  const appliedInitial = useRef(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [city, setCity] = useState(() => {
    if (initialCity || typeof window === "undefined") return initialCity;
    try {
      return localStorage.getItem(CITY_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [sortBy, setSortBy] = useState("rating");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  useEffect(() => {
    if (!appliedInitial.current) {
      appliedInitial.current = true;
      return;
    }
    setCity(initialCity);
  }, [initialCity]);

  function handleCitySelect(selectedCity: string) {
    setCity(selectedCity);
    setShowCitySheet(false);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, selectedCity);
    } catch { /* localStorage unavailable */ }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setShowCitySheet(true);
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/address/geocode?latlng=${latitude},${longitude}`);
          const data = (await res.json()) as { city?: string };
          if (data.city) {
            handleCitySelect(data.city);
          } else {
            setShowCitySheet(true);
          }
        } catch {
          setShowCitySheet(true);
        } finally {
          setGeolocating(false);
        }
      },
      () => {
        setGeolocating(false);
        setShowCitySheet(true);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  const fetchMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
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
  }, [activeCategory, city, sortBy, onlyVerified, page]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!city) {
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
        if (activeCategory) qs.set("category", activeCategory);
        qs.set("city", city);
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
  }, [activeCategory, city, sortBy, onlyVerified]);

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

  const hasFilters = Boolean(activeCategory || onlyVerified || sortBy !== "rating");

  function clearFilters() {
    setActiveCategory("");
    setOnlyVerified(false);
    setSortBy("rating");
  }

  const activeFilterLabels = [
    activeCategory ? CATEGORIES.find((c) => c.value === activeCategory)?.label : null,
    sortBy !== "rating" ? SORT_LABELS[sortBy] : null,
    onlyVerified ? "Verificadas" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* City selector overlay */}
      {showCitySheet && (
        <CitySelectorScreen
          onClose={() => setShowCitySheet(false)}
          onSelectCity={handleCitySelect}
        />
      )}

      <section className="client-explore-home">
        {/* Header */}
        <div>
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#f5c242]">EXPLORAR PERFIS</p>
          <h1 className="mt-2 text-[40px] font-black leading-[1.04] tracking-[-0.03em] text-white">
            {city ? (
              <>
                Acompanhantes{" "}
                <span className="text-[#f5c242]">em {city}</span>
              </>
            ) : (
              <>
                Perfis <span className="text-[#f5c242]">verificados</span>
                <br />perto de você
              </>
            )}
          </h1>
          <p className="mt-2 max-w-[360px] text-[15px] leading-6 text-[#9ca3af]">
            {city
              ? "Perfis verificados disponíveis na sua região."
              : "Encontre acompanhantes verificados na sua cidade com segurança e discrição."}
          </p>
        </div>

        {/* Hero image */}
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

        {/* City / search card */}
        <div className="relative z-10 -mt-6 rounded-[28px] border border-white/[0.10] bg-white/[0.055] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-black uppercase text-[#f5c242]">CIDADE</h2>
            {city && (
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-[#1f2227] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2a2d33] active:scale-[0.985]"
              >
                Filtros
                <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* City selector button */}
          <button
            type="button"
            onClick={() => setShowCitySheet(true)}
            className="flex w-full items-center gap-3 rounded-[18px] border border-white/[0.10] bg-[#111318] px-4 py-4 text-left transition active:bg-[#181c23]"
          >
            <MapPin className="h-5 w-5 shrink-0 text-[#f5c242]" />
            <span className={`flex-1 text-[16px] font-semibold ${city ? "text-white" : "text-white/38"}`}>
              {city || "Selecione uma cidade"}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/28" />
          </button>

          {/* Geolocation button */}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geolocating}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#d4a843]/28 bg-[#d4a843]/10 py-3 text-[13px] font-bold text-[#f5d78c] transition active:scale-[0.98] disabled:opacity-60"
          >
            {geolocating ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#f5d78c]/30 border-t-[#f5d78c]" />
            ) : (
              <Navigation2 className="h-3.5 w-3.5" />
            )}
            {geolocating ? "Buscando localização..." : "Usar minha localização"}
          </button>
        </div>

        {/* Categories */}
        <div className="mt-6">
          <p className="mb-3 text-[15px] font-black uppercase text-[#f5c242]">CATEGORIA</p>
          <div className="category-scroll">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setActiveCategory(c.value)}
                aria-pressed={activeCategory === c.value}
                className={`category-button ${activeCategory === c.value ? "active" : ""}`}
              >
                <CategoryIcon value={c.value} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter tags */}
        {hasFilters && (
          <div className="mt-4 rounded-[18px] border border-[#f5c242]/18 bg-[#f5c242]/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-[13px] font-semibold text-white/72">
                Filtros ativos
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

      {/* Results count */}
      {!loading && professionals.length > 0 && city && (
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-[13px] text-[#f5f0e4]/48">
            {total} {total === 1 ? "perfil encontrado" : "perfis encontrados"} em {city}
          </p>
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
          <EmptyState
            city={city}
            hasFilters={hasFilters}
            activeCategory={activeCategory}
            sortBy={sortBy}
            onClear={clearFilters}
            onChangeCity={() => setShowCitySheet(true)}
          />
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
                Ver mais perfis
              </button>
            )}
            {!hasMore && professionals.length > 4 && (
              <p className="pb-2 text-center text-[12px] text-[#f5f0e4]/28">
                Você viu todos os perfis disponíveis em {city}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
