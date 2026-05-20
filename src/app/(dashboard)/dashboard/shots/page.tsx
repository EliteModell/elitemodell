"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";

type ShotItem = {
  id: string;
  slug: string;
  displayName: string;
  city: string;
  state: string;
  image?: string | null;
  escortCategory?: string | null;
  rating: number;
  totalReviews: number;
  verified: boolean;
  photos: { id: string; url: string; cover: boolean }[];
};

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "MULHER", label: "Mulheres" },
  { value: "HOMEM", label: "Homens" },
  { value: "TRANS", label: "Trans" },
];

function ShotCard({ item }: { item: ShotItem }) {
  const [liked, setLiked] = useState(false);
  const photos = item.photos?.filter((p) => p.url) ?? [];
  const mainPhoto = photos.find((p) => p.cover)?.url ?? photos[0]?.url ?? item.image ?? null;

  return (
    <article className="client-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profissionais/${item.slug}`} className="flex min-w-0 items-center gap-3 no-underline">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-[#d4a843]/36 bg-[#1b1d1f]">
            {item.image ? (
              <img src={item.image} alt={item.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[13px] font-black text-[#8b6b25]">
                {item.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate text-[14px] font-semibold text-[#f5f0e4]">{item.displayName}</p>
              {item.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#4d9b56]" />}
            </div>
            <p className="flex items-center gap-1 text-[12px] text-[#f5f0e4]/48">
              <MapPin className="h-3 w-3" />
              {item.city}, {item.state}
            </p>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#c9a84c] text-[#c9a84c]" />
          <span className="text-[13px] font-semibold text-[#f5f0e4]">{item.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="relative aspect-square w-full bg-[#17191b]">
        {mainPhoto ? (
          <img src={mainPhoto} alt={item.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#141618]">
            <Camera className="h-12 w-12 text-[#f5f0e4]/18" />
          </div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            1/{photos.length}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
              liked ? "text-red-400" : "text-[#f5f0e4]/56"
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500" : ""}`} />
            Curtir
          </button>
          <Link
            href={`/profissionais/${item.slug}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#f5f0e4]/56 no-underline"
          >
            <MessageCircle className="h-5 w-5" />
            Ver perfil
          </Link>
          <button type="button" className="ml-auto text-[#f5f0e4]/56" aria-label="Compartilhar">
            <Send className="h-5 w-5" />
          </button>
        </div>
        {item.totalReviews > 0 && (
          <p className="mt-2 text-[12px] text-[#f5f0e4]/40">
            {item.totalReviews} avaliacao{item.totalReviews !== 1 ? "es" : ""}
          </p>
        )}
      </div>
    </article>
  );
}

function ShotSkeleton() {
  return (
    <div className="client-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="premium-skeleton h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <div className="premium-skeleton h-3.5 w-28 rounded-full" />
          <div className="premium-skeleton h-3 w-20 rounded-full" />
        </div>
      </div>
      <div className="premium-skeleton aspect-square w-full" />
      <div className="px-4 py-3">
        <div className="premium-skeleton h-4 w-32 rounded-full" />
      </div>
    </div>
  );
}

function EmptyShotsState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="client-empty px-5 py-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="mx-auto mt-4 max-w-[330px] text-[20px] font-black leading-6 text-[#f5f0e4]">
          {hasFilters ? "Nenhum Shot encontrado nessa busca" : "Quando houver publicacoes, elas aparecerao aqui"}
        </h2>
        <p className="mx-auto mt-3 max-w-[330px] text-[14px] leading-6 text-[#f5f0e4]/58">
          {hasFilters
            ? "Tente uma cidade diferente ou veja todos os perfis enquanto os Shots entram no ar."
            : "Shots reais de perfis disponiveis na sua cidade serao exibidos nesta area, sem sobrepor busca e filtros."}
        </p>
        <div className="mt-5 grid gap-2 sm:mx-auto sm:max-w-[420px] sm:grid-cols-2">
          <Link
            href="/dashboard/acompanhantes"
            className="client-primary-button inline-flex min-h-0 items-center justify-center gap-2 px-5 py-3 text-[13px] no-underline"
          >
            Explorar acompanhantes
          </Link>
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="client-secondary-button min-h-0 px-5 py-3 text-[13px]"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      <section className="client-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
            <Camera className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#f5f0e4]">Vitrine visual preparada</p>
            <p className="mt-1 text-[13px] leading-5 text-[#f5f0e4]/56">
              A grade vai ocupar mais espaco quando houver fotos, mantendo filtros separados e toque facil no celular.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ShotsPage() {
  const [items, setItems] = useState<ShotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [city, setCity] = useState("");
  const normalizedCity = city.trim();
  const hasFilters = Boolean(activeFilter || normalizedCity);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const qs = new URLSearchParams();
      if (activeFilter) qs.set("category", activeFilter);
      if (normalizedCity) qs.set("city", normalizedCity);
      qs.set("limit", "20");
      qs.set("sortBy", "rating");
      try {
        const r = await fetch(`/api/professionals?${qs}`, { signal: controller.signal });
        const data = await r.json();
        setItems(Array.isArray(data.professionals) ? data.professionals : []);
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [activeFilter, normalizedCity]);

  function clearFilters() {
    setActiveFilter("");
    setCity("");
  }

  return (
    <>
      {/* ── Hero escuro edge-to-edge ── */}
      <section className="px-0 pb-5">
        <div className="client-explore-hero" style={{ minHeight: 260 }}>
          <div className="relative z-10">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#f5d78c]/80">Feed visual</p>
            <div className="mt-2.5 h-px w-9 bg-[#d4a843]/50" />
            <h1 className="mt-3 bg-[linear-gradient(135deg,#fff8e8_0%,#f5f0e4_22%,#f5d78c_55%,#d4a843_100%)] bg-clip-text text-[64px] font-black leading-[0.90] text-transparent">
              Shots
            </h1>
            <p className="mt-4 max-w-[260px] text-[13px] leading-[1.65] text-[#f5f0e4]/50">
              Fotos de perfis verificados perto de voce, organizadas por cidade.
            </p>
          </div>
        </div>
      </section>

      {/* ── Painel de filtros ── */}
      <section className="px-0 pb-8">
        <div className="client-explore-search-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="client-kicker">Filtrar shots</p>
              <h2 className="mt-1 text-[22px] font-black leading-tight text-[#f5f0e4]">Cidade e categoria</h2>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="client-secondary-button min-h-0 shrink-0 px-3 py-2 text-[12px]"
              >
                Limpar
              </button>
            )}
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-[12px] font-black uppercase text-[#f5f0e4]/46">Cidade</span>
            <div className="client-explore-field">
              <Search className="h-5 w-5 shrink-0 text-[#f5d78c]" />
              <input
                type="text"
                placeholder="Digite uma cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-bold text-[#f5f0e4] outline-none placeholder:text-[#f5f0e4]/34"
                autoComplete="address-level2"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => setCity("")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[#f5f0e4]/58"
                  aria-label="Limpar cidade"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>

          <div className="mt-5 pb-3">
            <p className="mb-3 text-[12px] font-black uppercase text-[#f5f0e4]/46">Categoria</p>
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setActiveFilter(f.value)}
                  className={`min-h-[48px] rounded-[12px] px-4 text-[15px] font-black transition-colors ${
                    activeFilter === f.value ? "client-chip-active" : "client-chip"
                  }`}
                  aria-pressed={activeFilter === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Resultados ── */}
      <div className="px-4 pb-[calc(190px+env(safe-area-inset-bottom))]">
        {!loading && items.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-[#f5f0e4]/56">
              {items.length} shot{items.length !== 1 ? "s" : ""} encontrado{items.length !== 1 ? "s" : ""}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-[12px] font-black text-[#f5d78c]">
                Ver todos
              </button>
            )}
          </div>
        )}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <ShotSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyShotsState hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <div className="space-y-4">
            {items.map((item) => <ShotCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </>
  );
}
