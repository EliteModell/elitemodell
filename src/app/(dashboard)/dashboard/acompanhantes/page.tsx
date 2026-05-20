"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
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

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "MULHER", label: "Mulheres" },
  { value: "HOMEM", label: "Homens" },
  { value: "TRANS", label: "Trans" },
];

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
  category,
  onCategory,
  sortBy,
  onSortBy,
  onlyVerified,
  onOnlyVerified,
}: {
  open: boolean;
  onClose: () => void;
  category: string;
  onCategory: (v: string) => void;
  sortBy: string;
  onSortBy: (v: string) => void;
  onlyVerified: boolean;
  onOnlyVerified: (v: boolean) => void;
}) {
  return (
    <>
      {open && (
        <style>{`
          .client-bottom-nav {
            opacity: 0 !important;
            pointer-events: none !important;
            transform: translateY(120%) !important;
          }
        `}</style>
      )}
      <div
        className={`fixed inset-0 z-[65] bg-black/64 backdrop-blur-[3px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[70] max-h-[min(92dvh,720px)] overflow-y-auto rounded-t-[22px] border-t border-[#d4a843]/20 bg-[#0c0d0e] px-5 pb-[calc(env(safe-area-inset-bottom)+64px)] pt-3 shadow-[0_-28px_90px_rgba(0,0,0,0.62)] transition-transform duration-300 ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        aria-hidden={!open}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/16" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="client-kicker">Organizar resultados</p>
            <h2 className="mt-1 text-[24px] font-black leading-none text-[#f5f0e4]">Filtrar perfis</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-white/10 bg-white/[0.04] text-[#f5f0e4]/64"
            aria-label="Fechar filtros"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase text-[#f5f0e4]/44">Categoria</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategory(c.value)}
                  className={`min-h-[48px] rounded-[12px] px-4 text-[15px] font-bold transition-colors ${
                    category === c.value ? "client-chip-active" : "client-chip"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-black uppercase text-[#f5f0e4]/44">Ordenar por</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "rating", label: "Mais avaliados" },
                { value: "price_asc", label: "Menor preco" },
                { value: "price_desc", label: "Maior preco" },
                { value: "recent", label: "Mais recentes" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onSortBy(s.value)}
                  className={`min-h-[48px] rounded-[12px] px-3 text-[13px] font-bold transition-colors ${
                    sortBy === s.value ? "client-chip-active" : "client-chip"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="client-panel-soft flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#f5f0e4]">Somente verificadas</p>
              <p className="mt-1 text-[12px] leading-4 text-[#f5f0e4]/50">Perfis com identidade confirmada</p>
            </div>
            <button
              type="button"
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                onlyVerified ? "bg-[#4d9b56]" : "bg-white/18"
              }`}
              onClick={() => onOnlyVerified(!onlyVerified)}
              aria-pressed={onlyVerified}
              aria-label="Somente verificadas"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  onlyVerified ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <button type="button" onClick={onClose} className="client-primary-button mt-7 w-full text-[16px]">
          Aplicar filtros
        </button>
      </div>
    </>
  );
}

function EmptyState({
  hasFilters,
  onClear,
  onExploreCity,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onExploreCity: () => void;
}) {
  return (
    <section className="client-empty relative overflow-hidden px-5 py-9 text-center">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,140,0.55),transparent)]" />
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[14px] border border-[#d4a843]/26 bg-[#d4a843]/12 text-[#f5d78c] shadow-[0_14px_36px_rgba(212,168,67,0.12)]">
        {hasFilters ? <Search className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
      </div>
      <p className="mt-5 text-[11px] font-black uppercase text-[#f5d78c]/82">
        {hasFilters ? "Sem resultado nessa busca" : "Perfis verificados"}
      </p>
      <h2 className="mx-auto mt-2 max-w-[330px] text-[25px] font-black leading-tight text-[#f5f0e4]">
        {hasFilters ? "Nenhum perfil encontrado" : "Escolha uma cidade para ver os perfis"}
      </h2>
      <p className="mx-auto mt-3 max-w-[330px] text-[14px] leading-6 text-[#f5f0e4]/58">
        {hasFilters
          ? "Tente uma categoria mais ampla, limpe os filtros ou busque por outra cidade."
          : "Quando houver perfis ativos e verificados, eles aparecem aqui com foto, cidade, avaliacoes e contato."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={hasFilters ? onClear : onExploreCity}
          className="client-primary-button flex min-h-0 items-center justify-center gap-2 px-5 py-3 text-[14px]"
        >
          {hasFilters ? "Limpar filtros" : "Escolher cidade"}
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onExploreCity}
          className="client-secondary-button flex min-h-0 items-center justify-center gap-2 px-5 py-3 text-[14px]"
        >
          <MapPin className="h-4 w-4" />
          Trocar cidade
        </button>
      </div>
    </section>
  );
}

export default function AcompanhantesPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

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

  const hasFilters = Boolean(search || activeCategory || city || onlyVerified || sortBy !== "rating");

  function clearFilters() {
    setSearch("");
    setActiveCategory("");
    setCategory("");
    setCity("");
    setOnlyVerified(false);
    setSortBy("rating");
  }

  function focusCity() {
    document.querySelector<HTMLInputElement>('[data-client-city-filter="true"]')?.focus();
  }

  return (
    <>
      <section className="px-4 pb-7 pt-5">
        <div className="client-explore-hero">
          <div className="relative z-10">
            <p className="text-[12px] font-black uppercase text-[#f5d78c]/90">Explorar perfis</p>
            <h1 className="mt-3 max-w-[360px] bg-[linear-gradient(135deg,#fff8e8_0%,#f5f0e4_28%,#f5d78c_58%,#d4a843_100%)] bg-clip-text text-[42px] font-black leading-[0.98] text-transparent">
              Perfis verificados perto de voce
            </h1>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="client-explore-search-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="client-kicker">Busca</p>
              <h2 className="mt-1 text-[24px] font-black leading-tight text-[#f5f0e4]">Escolha onde procurar</h2>
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border transition-colors ${
                onlyVerified || sortBy !== "rating"
                  ? "border-[#d4a843]/40 bg-[#d4a843]/14 text-[#f5d78c]"
                  : "border-white/[0.09] bg-white/[0.06] text-[#f5f0e4]/64"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[12px] font-black uppercase text-[#f5f0e4]/46">Cidade</span>
              <div className="client-explore-field">
                <MapPin className="h-5 w-5 shrink-0 text-[#f5d78c]" />
                <input
                  type="text"
                  placeholder="Digite a cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-bold text-[#f5f0e4] outline-none placeholder:text-[#f5f0e4]/34"
                  data-client-city-filter="true"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black uppercase text-[#f5f0e4]/46">Nome ou estilo</span>
              <div className="client-explore-field">
                <Search className="h-5 w-5 shrink-0 text-[#f5d78c]" />
                <input
                type="text"
                  placeholder="nome, bairro ou estilo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-bold text-[#f5f0e4] outline-none placeholder:text-[#f5f0e4]/34"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[#f5f0e4]/58"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[12px] font-black uppercase text-[#f5f0e4]/46">Categoria</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setActiveCategory(c.value);
                    setCategory(c.value);
                  }}
                  className={`min-h-[48px] rounded-[12px] px-4 text-[15px] font-black transition-colors ${
                    activeCategory === c.value ? "client-chip-active" : "client-chip"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="client-secondary-button mt-7 flex min-h-[62px] w-full items-center justify-center gap-3 rounded-[14px] px-4 text-[16px]"
          >
            <SlidersHorizontal className="h-5 w-5" />
            Filtros avancados
          </button>

          {hasFilters && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-[#d4a843]/16 bg-[#d4a843]/8 px-3 py-3">
              <span className="min-w-0 truncate text-[13px] font-semibold text-[#f5f0e4]/62">
                Busca personalizada ativa
              </span>
              <button type="button" onClick={clearFilters} className="shrink-0 text-[13px] font-black text-[#f5d78c]">
                Limpar
              </button>
            </div>
          )}
        </div>
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

      <div className="space-y-4 px-4 pb-[calc(170px+env(safe-area-inset-bottom))]">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <ProfileCardSkeleton key={i} />)
        ) : professionals.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} onExploreCity={focusCity} />
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

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        category={category}
        onCategory={(v) => {
          setCategory(v);
          setActiveCategory(v);
        }}
        sortBy={sortBy}
        onSortBy={setSortBy}
        onlyVerified={onlyVerified}
        onOnlyVerified={setOnlyVerified}
      />
    </>
  );
}
