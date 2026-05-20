"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  Phone,
  Search,
  Star,
  SlidersHorizontal,
  Users,
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

/* ─── Loading skeleton ─── */
function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#101214]">
      <div className="premium-skeleton h-[260px] w-full" />
      <div className="space-y-2 px-4 py-3">
        <div className="premium-skeleton h-4 w-[52%] rounded-full" />
        <div className="premium-skeleton h-3.5 w-[36%] rounded-full" />
      </div>
      <div className="flex gap-2.5 px-4 pb-4">
        <div className="premium-skeleton h-11 flex-1 rounded-[8px]" />
        <div className="premium-skeleton h-11 w-[108px] rounded-[8px]" />
      </div>
    </div>
  );
}

/* ─── Professional card (overlay design) ─── */
function ProfessionalCard({ p }: { p: Professional }) {
  const cover = p.photos?.find((ph) => ph.cover)?.url ?? p.image ?? null;
  const price = p.pricePerHour ?? p.priceMin;
  const isOnline = p.featured || p.rating >= 4.7;

  return (
    <article className="client-profile-card">
      <div className="relative h-[260px] w-full overflow-hidden bg-[#17191b]">
        {cover ? (
          <img src={cover} alt={p.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#141618]">
            <span className="text-[52px] font-black text-[#f5f0e4]/10">
              {p.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {isOnline ? (
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-bold text-[#5ede6d] backdrop-blur-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ede6d] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5ede6d]" />
              </span>
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

        {/* Bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold leading-tight text-white">{p.displayName}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-white/50" />
                <span className="truncate text-[12px] text-white/65">{p.city}, {p.state}</span>
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

      {/* Info strip */}
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

      {/* Actions */}
      <div className="flex gap-2.5 px-4 pb-4">
        <Link
          href={`/profissionais/${p.slug}`}
          className="client-secondary-button flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[14px] font-bold no-underline"
        >
          Ver perfil
          <ChevronRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          className="client-primary-button flex min-h-0 items-center gap-1.5 px-5 py-2.5 text-[14px]"
        >
          <Phone className="h-4 w-4" />
          Contato
        </button>
      </div>
    </article>
  );
}

/* ─── Filter bottom sheet ─── */
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
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[16px] border-t border-[#d4a843]/16 bg-[#0c0d0e] p-5 pb-10 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#f5f0e4]">Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.04] text-[#f5f0e4]/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#f5f0e4]/40">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategory(c.value)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${category === c.value ? "client-chip-active" : "client-chip"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#f5f0e4]/40">Ordenar por</p>
            <div className="flex flex-wrap gap-2">
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
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${sortBy === s.value ? "client-chip-active" : "client-chip"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="client-panel-soft flex cursor-pointer items-center justify-between p-4">
            <div>
              <p className="text-[14px] font-semibold text-[#f5f0e4]">Somente verificadas</p>
              <p className="mt-0.5 text-[12px] text-[#f5f0e4]/46">Perfis com identidade confirmada</p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${onlyVerified ? "bg-[#4d9b56]" : "bg-white/18"}`}
              onClick={() => onOnlyVerified(!onlyVerified)}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${onlyVerified ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </label>
        </div>

        <button type="button" onClick={onClose} className="client-primary-button mt-6 w-full text-[15px]">
          Aplicar filtros
        </button>
      </div>
    </>
  );
}

/* ─── Empty state ─── */
function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex min-h-[calc(100dvh-300px)] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-full border border-[#d4a843]/16 bg-[#d4a843]/8">
        <Users className="h-9 w-9 text-[#f5d78c]" />
      </div>
      <h2 className="text-[20px] font-bold text-[#f5f0e4]">
        {hasFilters ? "Nenhum perfil encontrado" : "Nenhum perfil disponível"}
      </h2>
      <p className="mt-2.5 max-w-[280px] text-[14px] leading-6 text-[#f5f0e4]/50">
        {hasFilters
          ? "Tente ajustar os filtros ou buscar em outra cidade."
          : "Os perfis verificados aparecerão aqui em breve."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="client-secondary-button mt-7 min-h-0 px-7 py-3 text-[14px]"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/* ─── Page ─── */
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
      /* ignore */
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

  const hasFilters = Boolean(search || activeCategory || city || onlyVerified);

  function clearFilters() {
    setSearch("");
    setActiveCategory("");
    setCity("");
    setOnlyVerified(false);
  }

  return (
    <>
      {/* Page header */}
      <section className="px-4 pb-4 pt-5">
        <p className="client-kicker">Descoberta</p>
        <h1 className="client-title mt-1">Explorar</h1>
        <p className="client-subtitle mt-1.5">Perfis verificados por cidade, estilo e avaliações.</p>
      </section>

      {/* Sticky search + category bar */}
      <div className="sticky top-[116px] z-20 border-y border-white/[0.07] bg-[#07090a]/94 pb-3 pt-3 backdrop-blur-2xl">
        <div className="px-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
              <input
                type="text"
                placeholder="Nome, cidade ou estilo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="client-input h-[42px] w-full pl-10 pr-4 text-[14px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] border transition-colors ${
                onlyVerified || sortBy !== "rating"
                  ? "border-[#d4a843]/40 bg-[#d4a843]/12 text-[#f5d78c]"
                  : "border-white/[0.09] bg-white/[0.05] text-[#f5f0e4]/60"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Category chips */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setActiveCategory(c.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${activeCategory === c.value ? "client-chip-active" : "client-chip"}`}
              >
                {c.label}
              </button>
            ))}
            <div className="relative shrink-0">
              <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#d4a843]" />
              <input
                type="text"
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="client-input h-[34px] w-[112px] rounded-full pl-7 pr-3 text-[12px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && professionals.length > 0 && (
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="text-[13px] text-[#f5f0e4]/40">{total} perfis</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-[12px] font-semibold text-[#f5d78c]">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4 px-4 pb-6 pt-3">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <ProfileCardSkeleton key={i} />)
        ) : professionals.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
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
                Você viu todos os perfis disponíveis
              </p>
            )}
          </>
        )}
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        category={category}
        onCategory={(v) => { setCategory(v); setActiveCategory(v); }}
        sortBy={sortBy}
        onSortBy={setSortBy}
        onlyVerified={onlyVerified}
        onOnlyVerified={setOnlyVerified}
      />
    </>
  );
}
