"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  Filter,
  MapPin,
  Phone,
  Search,
  Star,
  SlidersHorizontal,
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

function ProfessionalCard({ p }: { p: Professional }) {
  const cover = p.photos?.find((ph) => ph.cover)?.url ?? p.image ?? null;
  const price = p.pricePerHour ?? p.priceMin;

  return (
    <article className="client-card overflow-hidden">
      {/* Cover photo */}
      <div className="relative h-[230px] w-full bg-[#17191b]">
        {cover ? (
          <img src={cover} alt={p.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2b2211] via-[#17191b] to-[#3a1015]">
            <span className="text-[48px] font-black text-[#f5d78c]/35">
              {p.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#101214] to-transparent" />
        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.verified && (
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0d1318]/78 px-2 py-1 text-[11px] font-semibold text-[#7ed58a] backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verificada
            </span>
          )}
          {p.featured && (
            <span className="rounded-full bg-[#d4a843] px-2 py-1 text-[11px] font-semibold text-[#0d1318]">
              Destaque
            </span>
          )}
        </div>
        {/* Price */}
        {price ? (
          <div className="absolute bottom-3 right-3 rounded-[8px] border border-[#d4a843]/24 bg-[#0d1318]/80 px-2.5 py-1 backdrop-blur-sm">
            <p className="text-[12px] font-bold text-[#f5d78c]">
              {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h
            </p>
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold text-[#f5f0e4]">{p.displayName}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[#d4a843] text-[#d4a843]" />
            <span className="text-[13px] font-semibold text-[#f5f0e4]">{p.rating.toFixed(1)}</span>
            <span className="text-[12px] text-[#f5f0e4]/40">({p.totalReviews})</span>
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#f5f0e4]/52">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{p.city}, {p.state}</span>
        </div>

        {p.bio ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#f5f0e4]/58">{p.bio}</p>
        ) : null}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/profissionais/${p.slug}`}
            className="client-secondary-button flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] no-underline"
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
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#d4a843]/18 bg-[#090a0b] p-5 pb-8 shadow-[0_-20px_70px_rgba(0,0,0,0.5)] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#f5f0e4]">Filtros</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/70">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase text-[#f5f0e4]/48">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategory(c.value)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    category === c.value
                      ? "client-chip-active"
                      : "client-chip"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase text-[#f5f0e4]/48">Ordenar por</p>
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
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    sortBy === s.value
                      ? "client-chip-active"
                      : "client-chip"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="client-panel-soft flex cursor-pointer items-center justify-between p-4">
            <div>
              <p className="text-[14px] font-semibold text-[#f5f0e4]">Somente verificadas</p>
              <p className="mt-0.5 text-[12px] text-[#f5f0e4]/48">Perfis com identidade confirmada</p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${onlyVerified ? "bg-[#4d9b56]" : "bg-[#d0d7da]"}`}
              onClick={() => onOnlyVerified(!onlyVerified)}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${onlyVerified ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </label>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="client-primary-button mt-6 w-full text-[15px]"
        >
          Aplicar filtros
        </button>
      </div>
    </>
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
      const pages = data.pages ?? 1;
      setProfessionals((prev) => [...prev, ...list]);
      setPage(nextPage);
      setHasMore(nextPage < pages);
    } catch {/* ignore */} finally {
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

  return (
    <>
      <section className="client-page-header">
        <p className="client-kicker">Descoberta</p>
        <h1 className="client-title mt-1">Explorar acompanhantes</h1>
        <p className="client-subtitle mt-2">Encontre perfis verificados por cidade, estilo e avaliações.</p>
      </section>

      {/* Sticky search + filter header */}
      <div className="sticky top-[116px] z-20 border-y border-[#d4a843]/10 bg-[#090a0b]/86 pb-3 pt-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="px-4">
          {/* Search + filter button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
              <input
                type="text"
                placeholder="Buscar nome ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="client-input h-[44px] w-full pl-9 pr-4 text-[14px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="client-secondary-button flex h-[44px] min-h-0 w-[44px] shrink-0 items-center justify-center"
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setActiveCategory(c.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  activeCategory === c.value
                    ? "client-chip-active"
                    : "client-chip"
                }`}
              >
                {c.label}
              </button>
            ))}
            {/* City quick filter */}
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
      {!loading && (
        <div className="px-4 pt-4 pb-1">
          <p className="text-[13px] text-[#f5f0e4]/52">
            {total > 0 ? `${total} acompanhantes encontradas` : "Nenhuma acompanhante encontrada"}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="px-4 pt-3 pb-4 space-y-4">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-skeleton h-[340px] rounded-[8px]" />
          ))
        ) : professionals.length === 0 ? (
          <div className="client-empty flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
              <Filter className="h-8 w-8 text-[#f5d78c]" />
            </div>
            <p className="text-[15px] font-semibold text-[#f5f0e4]">Nenhuma acompanhante encontrada</p>
            <p className="text-[13px] text-[#f5f0e4]/56">Tente ajustar os filtros ou buscar em outra cidade.</p>
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveCategory(""); setCity(""); }}
              className="client-secondary-button mt-2 min-h-0 px-5 py-2 text-[13px]"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {professionals.map((p) => (
              <ProfessionalCard key={p.id} p={p} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => void fetchMore()}
                disabled={loading}
                className="client-secondary-button w-full text-[14px] transition-colors active:bg-white/10"
              >
                {loading ? "Carregando..." : "Ver mais"}
              </button>
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
