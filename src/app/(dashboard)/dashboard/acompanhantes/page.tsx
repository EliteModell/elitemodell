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
  Sparkles,
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

/* ─── Static featured banner ─── */
function FeaturedBanner() {
  return (
    <div className="relative mx-4 mb-5 mt-1 overflow-hidden rounded-[12px] border border-[#d4a843]/22 shadow-[0_20px_60px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] via-[#110e08] to-[#130a0d]" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-[#d4a843]/22 blur-[44px]" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-36 w-36 rounded-full bg-[#8f1d24]/26 blur-[32px]" />
      <div className="relative flex items-end gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#f5d78c]">Elite Modell</p>
          <h2 className="mt-1.5 text-[22px] font-black leading-tight text-[#f5f0e4]">
            Perfis verificados<br />em sua cidade
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-[#f5f0e4]/58">
            Acompanhantes com fotos reais, avaliações autênticas e total discrição.
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="flex -space-x-2.5">
              {["V", "A", "J", "R"].map((l, i) => (
                <div
                  key={i}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-[#110e08] bg-gradient-to-br from-[#2b2211] to-[#8f1d24]/60"
                >
                  <span className="text-[10px] font-bold text-[#f5d78c]">{l}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#f5f0e4]/58">
              <span className="font-bold text-[#f5d78c]">+2.400</span> perfis verificados
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <div className="grid h-14 w-14 place-items-center rounded-[10px] border border-[#d4a843]/24 bg-[#d4a843]/10">
            <BadgeCheck className="h-7 w-7 text-[#f5d78c]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Horizontal "Em Alta" carousel ─── */
function HorizontalProfileScroll({ profiles }: { profiles: Professional[] }) {
  const featured = profiles
    .filter((p) => p.featured || p.rating >= 4.5)
    .slice(0, 9);
  if (!featured.length) return null;

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <p className="client-kicker">Em alta</p>
          <h2 className="mt-0.5 text-[18px] font-bold text-[#f5f0e4]">Perfis em destaque</h2>
        </div>
        <Link href="/dashboard/acompanhantes" className="text-[13px] font-semibold text-[#f5d78c] no-underline">
          Ver todos
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {featured.map((p) => {
          const cover = p.photos?.find((ph) => ph.cover)?.url ?? p.image ?? null;
          const isOnline = p.featured || p.rating >= 4.7;
          return (
            <Link key={p.id} href={`/profissionais/${p.slug}`} className="client-carousel-card shrink-0 no-underline">
              <div className="relative h-[168px] w-[120px]">
                {cover ? (
                  <img src={cover} alt={p.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2b2211] to-[#3a1015]">
                    <span className="text-[34px] font-black text-[#f5d78c]/35">
                      {p.displayName[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/94 to-transparent" />
                {isOnline && (
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ede6d] opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#5ede6d]" />
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="truncate text-[13px] font-bold leading-4 text-white">{p.displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/60">{p.city}</p>
                </div>
              </div>
            </Link>
          );
        })}
        <Link href="/dashboard/acompanhantes" className="shrink-0 no-underline">
          <div className="flex h-[168px] w-[86px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d4a843]/24 bg-[#d4a843]/5">
            <Sparkles className="h-5 w-5 text-[#f5d78c]" />
            <p className="mt-2 text-center text-[11px] font-semibold leading-4 text-[#f5d78c]">Ver<br />todos</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─── */
function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#d4a843]/10 bg-[#101214]">
      <div className="premium-skeleton h-[268px] w-full" />
      <div className="space-y-2.5 px-4 py-3">
        <div className="premium-skeleton h-4 w-[55%] rounded-full" />
        <div className="premium-skeleton h-3.5 w-[38%] rounded-full" />
      </div>
      <div className="flex gap-2.5 px-4 pb-4">
        <div className="premium-skeleton h-12 flex-1 rounded-[8px]" />
        <div className="premium-skeleton h-12 w-[116px] rounded-[8px]" />
      </div>
    </div>
  );
}

/* ─── Main professional card (overlay design) ─── */
function ProfessionalCard({ p }: { p: Professional }) {
  const cover = p.photos?.find((ph) => ph.cover)?.url ?? p.image ?? null;
  const price = p.pricePerHour ?? p.priceMin;
  const isOnline = p.featured || p.rating >= 4.7;

  return (
    <article className="client-profile-card">
      {/* Cover image */}
      <div className="relative h-[268px] w-full overflow-hidden bg-[#17191b]">
        {cover ? (
          <img
            src={cover}
            alt={p.displayName}
            className="h-full w-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2b2211] via-[#17191b] to-[#3a1015]">
            <span className="text-[56px] font-black text-[#f5d78c]/28">
              {p.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/96 via-black/62 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {isOnline ? (
            <span className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/65 px-2.5 py-1 text-[11px] font-bold text-[#5ede6d] backdrop-blur-md">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ede6d] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5ede6d]" />
              </span>
              Online agora
            </span>
          ) : p.verified ? (
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[11px] font-semibold text-[#7ed58a] backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verificada
            </span>
          ) : null}
          {p.featured && (
            <span className="rounded-full bg-[#d4a843] px-2.5 py-1 text-[11px] font-bold text-[#0d1318] shadow-[0_0_14px_rgba(212,168,67,0.50)]">
              Destaque
            </span>
          )}
        </div>

        {/* Bottom overlay: name + city + price */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[20px] font-bold leading-tight text-white drop-shadow-sm">
                {p.displayName}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-white/55" />
                <span className="truncate text-[12px] text-white/68">
                  {p.city}, {p.state}
                </span>
              </div>
            </div>
            {price ? (
              <div className="shrink-0 rounded-[6px] border border-[#d4a843]/30 bg-black/76 px-2.5 py-1.5 backdrop-blur-sm">
                <p className="text-[13px] font-bold text-[#f5d78c]">
                  {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-center gap-2.5 border-t border-white/[0.055] px-4 py-2.5">
        {p.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#7ed58a]" />}
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#d4a843] text-[#d4a843]" />
          <span className="text-[13px] font-bold text-[#f5f0e4]">{p.rating.toFixed(1)}</span>
          <span className="text-[12px] text-[#f5f0e4]/38">({p.totalReviews})</span>
        </div>
        {p.bio ? (
          <p className="ml-auto line-clamp-1 min-w-0 max-w-[160px] text-right text-[12px] text-[#f5f0e4]/44">
            {p.bio}
          </p>
        ) : null}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 px-4 pb-4">
        <Link
          href={`/profissionais/${p.slug}`}
          className="client-secondary-button flex flex-1 items-center justify-center gap-1.5 py-3 text-[14px] font-bold no-underline"
        >
          Ver perfil
          <ChevronRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          className="client-primary-button flex min-h-0 items-center gap-1.5 px-5 py-3 text-[14px]"
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
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[16px] border-t border-[#d4a843]/18 bg-[#090a0b] p-5 pb-10 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#f5f0e4]">Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#f5f0e4]/46">
              Categoria
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategory(c.value)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    category === c.value ? "client-chip-active" : "client-chip"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#f5f0e4]/46">
              Ordenar por
            </p>
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
                    sortBy === s.value ? "client-chip-active" : "client-chip"
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
              className={`relative h-6 w-11 rounded-full transition-colors ${onlyVerified ? "bg-[#4d9b56]" : "bg-white/20"}`}
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
      const pages = data.pages ?? 1;
      setProfessionals((prev) => [...prev, ...list]);
      setPage(nextPage);
      setHasMore(nextPage < pages);
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

  return (
    <>
      {/* Page header */}
      <section className="client-page-header">
        <p className="client-kicker">Descoberta</p>
        <h1 className="client-title mt-1">Explorar</h1>
        <p className="client-subtitle mt-1.5">Perfis verificados por cidade, estilo e avaliações.</p>
      </section>

      {/* Sticky search + category bar */}
      <div className="sticky top-[116px] z-20 border-y border-[#d4a843]/10 bg-[#090a0b]/90 pb-3 pt-4 shadow-[0_14px_38px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
        <div className="px-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
              <input
                type="text"
                placeholder="Nome, cidade ou estilo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="client-input h-[44px] w-full pl-9 pr-4 text-[14px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[8px] border text-[#f5f0e4]/80 transition-colors ${
                onlyVerified || sortBy !== "rating"
                  ? "border-[#d4a843]/48 bg-[#d4a843]/14 text-[#f5d78c]"
                  : "border-[#f5d78c]/18 bg-white/[0.06]"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Category chips + city input */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setActiveCategory(c.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  activeCategory === c.value ? "client-chip-active" : "client-chip"
                }`}
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
                className="client-input h-[34px] w-[116px] rounded-full pl-7 pr-3 text-[12px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured banner — always visible */}
      <FeaturedBanner />

      {/* "Em Alta" carousel — only when data is ready */}
      {!loading && <HorizontalProfileScroll profiles={professionals} />}

      {/* Section divider */}
      {!loading && professionals.length > 0 && (
        <div className="client-section-divider mb-4 mt-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#f5f0e4]/38">
            {total > 0 ? `${total} perfis` : "Perfis"}
          </span>
        </div>
      )}

      {/* Cards grid */}
      <div className="space-y-4 px-4 pb-6 pt-1">
        {loading && professionals.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)
        ) : professionals.length === 0 ? (
          <div className="client-empty flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[10px] border border-white/10 bg-white/[0.045]">
              <Filter className="h-8 w-8 text-[#f5d78c]" />
            </div>
            <p className="text-[15px] font-semibold text-[#f5f0e4]">Nenhum perfil encontrado</p>
            <p className="text-[13px] text-[#f5f0e4]/54">
              Tente ajustar os filtros ou buscar em outra cidade.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("");
                  setCity("");
                  setOnlyVerified(false);
                }}
                className="client-secondary-button mt-2 min-h-0 px-5 py-2.5 text-[13px]"
              >
                Limpar filtros
              </button>
            )}
          </div>
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
                className="client-secondary-button w-full py-3.5 text-[14px] font-semibold transition-colors active:bg-white/10"
              >
                Ver mais perfis
              </button>
            )}

            {!hasMore && professionals.length > 4 && (
              <p className="pb-2 text-center text-[12px] text-[#f5f0e4]/34">
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
