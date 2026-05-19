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
    <article className="overflow-hidden rounded-[14px] bg-white shadow-[0_2px_12px_rgba(20,31,36,0.08)]">
      {/* Cover photo */}
      <div className="relative h-[200px] w-full bg-[#d5d9db]">
        {cover ? (
          <img src={cover} alt={p.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#e0e5e7] to-[#c8ced1]">
            <span className="text-[48px] font-black text-white/40">
              {p.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.verified && (
            <span className="flex items-center gap-1 rounded-full bg-[#0d1318]/75 px-2 py-0.5 text-[11px] font-semibold text-[#4d9b56] backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verificada
            </span>
          )}
          {p.featured && (
            <span className="rounded-full bg-[#c9a84c]/90 px-2 py-0.5 text-[11px] font-semibold text-[#0d1318]">
              Destaque
            </span>
          )}
        </div>
        {/* Price */}
        {price ? (
          <div className="absolute bottom-3 right-3 rounded-[8px] bg-[#0d1318]/80 px-2.5 py-1 backdrop-blur-sm">
            <p className="text-[12px] font-bold text-[#c9a84c]">
              {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h
            </p>
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold text-[#1f2a30]">{p.displayName}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[#c9a84c] text-[#c9a84c]" />
            <span className="text-[13px] font-semibold text-[#1f2a30]">{p.rating.toFixed(1)}</span>
            <span className="text-[12px] text-[#8fa0a8]">({p.totalReviews})</span>
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#6a7a81]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{p.city}, {p.state}</span>
        </div>

        {p.bio ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#566570]">{p.bio}</p>
        ) : null}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/profissionais/${p.slug}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#d0d7da] bg-white py-2.5 text-[13px] font-semibold text-[#1f2a30] no-underline"
          >
            Ver perfil
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[10px] bg-[#c9a84c] px-4 py-2.5 text-[13px] font-semibold text-[#0d1318]"
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
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] bg-white p-5 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#1f2a30]">Filtros</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f3f5] text-[#5a6a71]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6a7a81]">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategory(c.value)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    category === c.value
                      ? "bg-[#1f2a30] text-white"
                      : "border border-[#d0d7da] bg-white text-[#4a5a61]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6a7a81]">Ordenar por</p>
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
                      ? "bg-[#1f2a30] text-white"
                      : "border border-[#d0d7da] bg-white text-[#4a5a61]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#e4eaec] bg-white p-4">
            <div>
              <p className="text-[14px] font-semibold text-[#1f2a30]">Somente verificadas</p>
              <p className="mt-0.5 text-[12px] text-[#6a7a81]">Perfis com identidade confirmada</p>
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
          className="mt-6 h-[48px] w-full rounded-[12px] bg-[#1f2a30] text-[15px] font-semibold text-white"
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
      {/* Sticky search + filter header */}
      <div className="sticky top-0 z-20 bg-[#f0f3f5] pb-3 pt-4 shadow-[0_2px_8px_rgba(20,31,36,0.06)]">
        <div className="px-4">
          {/* Search + filter button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0a8]" />
              <input
                type="text"
                placeholder="Buscar nome ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-[44px] w-full rounded-[10px] border border-[#d0d7da] bg-white pl-9 pr-4 text-[14px] text-[#1f2a30] placeholder:text-[#8fa0a8] outline-none focus:border-[#c9a84c]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] border border-[#d0d7da] bg-white text-[#5a6a71]"
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
                    ? "bg-[#1f2a30] text-white"
                    : "border border-[#d0d7da] bg-white text-[#4a5a61]"
                }`}
              >
                {c.label}
              </button>
            ))}
            {/* City quick filter */}
            <div className="relative shrink-0">
              <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8fa0a8]" />
              <input
                type="text"
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-[34px] w-[110px] rounded-full border border-[#d0d7da] bg-white pl-7 pr-3 text-[12px] text-[#1f2a30] placeholder:text-[#8fa0a8] outline-none focus:border-[#c9a84c]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="px-4 pt-4 pb-1">
          <p className="text-[13px] text-[#6a7a81]">
            {total > 0 ? `${total} acompanhantes encontradas` : "Nenhuma acompanhante encontrada"}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="px-4 pt-3 pb-4 space-y-4">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[320px] animate-pulse rounded-[14px] bg-[#e4eaec]" />
          ))
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#e4eaec]">
              <Filter className="h-8 w-8 text-[#8fa0a8]" />
            </div>
            <p className="text-[15px] font-semibold text-[#1f2a30]">Nenhuma acompanhante encontrada</p>
            <p className="text-[13px] text-[#6a7a81]">Tente ajustar os filtros ou buscar em outra cidade.</p>
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveCategory(""); setCity(""); }}
              className="mt-2 rounded-full border border-[#c9a84c] px-5 py-2 text-[13px] font-semibold text-[#a9822d]"
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
                className="h-[48px] w-full rounded-[12px] border border-[#d0d7da] bg-white text-[14px] font-semibold text-[#1f2a30] transition-colors active:bg-[#f5f8f9]"
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
