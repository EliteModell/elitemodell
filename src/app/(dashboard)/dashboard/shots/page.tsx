"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Star,
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
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profissionais/${item.slug}`} className="flex items-center gap-3 no-underline">
          <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#d4a843]/40 bg-[#1b1d1f]">
            {item.image ? (
              <img src={item.image} alt={item.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[13px] font-black text-[#8b6b25]">
                {item.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
                <p className="text-[14px] font-semibold text-[#f5f0e4]">{item.displayName}</p>
              {item.verified && <BadgeCheck className="h-4 w-4 text-[#4d9b56]" />}
            </div>
            <p className="flex items-center gap-1 text-[12px] text-[#f5f0e4]/52">
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

      {/* Photo */}
      <div className="relative aspect-square w-full bg-[#17191b]">
        {mainPhoto ? (
          <img src={mainPhoto} alt={item.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2b2211] via-[#17191b] to-[#3a1015]">
            <span className="text-[80px] font-black text-[#f5d78c]/30">
              {item.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Photo count badge */}
        {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-[#0d1318]/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            1/{photos.length}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
              liked ? "text-red-400" : "text-[#f5f0e4]/62"
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500" : ""}`} />
            Curtir
          </button>
          <Link
            href={`/profissionais/${item.slug}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#f5f0e4]/62 no-underline"
          >
            <MessageCircle className="h-5 w-5" />
            Ver perfil
          </Link>
          <button type="button" className="ml-auto text-[#f5f0e4]/62" aria-label="Compartilhar">
            <Send className="h-5 w-5" />
          </button>
        </div>
        {item.totalReviews > 0 && (
          <p className="mt-2 text-[12px] text-[#f5f0e4]/46">
            {item.totalReviews} avaliação{item.totalReviews !== 1 ? "ões" : ""}
          </p>
        )}
      </div>
    </article>
  );
}

export default function ShotsPage() {
  const [items, setItems] = useState<ShotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      const qs = new URLSearchParams();
      if (activeFilter) qs.set("category", activeFilter);
      if (city) qs.set("city", city);
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
  }, [activeFilter, city]);

  return (
    <>
      <section className="client-page-header">
        <p className="client-kicker">Feed visual</p>
        <h1 className="client-title mt-1">Shots</h1>
        <p className="client-subtitle mt-2">Um fluxo rápido para descobrir perfis por fotos e cidade.</p>
      </section>

      {/* Sticky filter header */}
      <div className="sticky top-[116px] z-20 border-y border-[#d4a843]/10 bg-[#090a0b]/86 pb-3 pt-3 backdrop-blur-2xl">
        <div className="px-4">
          {/* City search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="client-input h-[40px] w-full pl-9 pr-4 text-[13px]"
            />
          </div>
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                  activeFilter === f.value
                    ? "client-chip-active"
                    : "client-chip"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4 px-4 pb-4 pt-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="client-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="premium-skeleton h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <div className="premium-skeleton h-3.5 w-28 rounded" />
                  <div className="premium-skeleton h-3 w-20 rounded" />
                </div>
              </div>
              <div className="premium-skeleton aspect-square w-full" />
              <div className="px-4 py-3">
                <div className="premium-skeleton h-4 w-32 rounded" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="client-empty flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
              <Heart className="h-8 w-8 text-[#f5d78c]" />
            </div>
            <p className="text-[15px] font-semibold text-[#f5f0e4]">Nenhum shot encontrado</p>
            <p className="text-[13px] text-[#f5f0e4]/54">Tente outra cidade ou categoria.</p>
          </div>
        ) : (
          items.map((item) => <ShotCard key={item.id} item={item} />)
        )}
      </div>
    </>
  );
}
