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
    <article className="bg-white">
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profissionais/${item.slug}`} className="flex items-center gap-3 no-underline">
          <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#c9a84c]/40 bg-[#d5d9db]">
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
              <p className="text-[14px] font-semibold text-[#1f2a30]">{item.displayName}</p>
              {item.verified && <BadgeCheck className="h-4 w-4 text-[#4d9b56]" />}
            </div>
            <p className="flex items-center gap-1 text-[12px] text-[#6a7a81]">
              <MapPin className="h-3 w-3" />
              {item.city}, {item.state}
            </p>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#c9a84c] text-[#c9a84c]" />
          <span className="text-[13px] font-semibold text-[#1f2a30]">{item.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Photo */}
      <div className="relative aspect-square w-full bg-[#d5d9db]">
        {mainPhoto ? (
          <img src={mainPhoto} alt={item.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#e0e5e7] to-[#c8ced1]">
            <span className="text-[80px] font-black text-white/30">
              {item.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Photo count badge */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-[#0d1318]/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
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
              liked ? "text-red-500" : "text-[#4a5a61]"
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500" : ""}`} />
            Curtir
          </button>
          <Link
            href={`/profissionais/${item.slug}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4a5a61] no-underline"
          >
            <MessageCircle className="h-5 w-5" />
            Ver perfil
          </Link>
          <button type="button" className="ml-auto text-[#4a5a61]" aria-label="Compartilhar">
            <Send className="h-5 w-5" />
          </button>
        </div>
        {item.totalReviews > 0 && (
          <p className="mt-2 text-[12px] text-[#6a7a81]">
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
      {/* Sticky filter header */}
      <div className="sticky top-0 z-20 border-b border-[#e4eaec] bg-white pb-3 pt-3">
        <div className="px-4">
          {/* City search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0a8]" />
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-[40px] w-full rounded-[10px] border border-[#d0d7da] bg-[#f5f8f9] pl-9 pr-4 text-[13px] text-[#1f2a30] placeholder:text-[#8fa0a8] outline-none focus:border-[#c9a84c] focus:bg-white"
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
                    ? "bg-[#1f2a30] text-white"
                    : "border border-[#d0d7da] bg-white text-[#4a5a61]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="divide-y divide-[#f0f3f5]">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-[#e4eaec]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-[#e4eaec]" />
                  <div className="h-3 w-20 animate-pulse rounded bg-[#e4eaec]" />
                </div>
              </div>
              <div className="aspect-square w-full animate-pulse bg-[#e4eaec]" />
              <div className="px-4 py-3">
                <div className="h-4 w-32 animate-pulse rounded bg-[#e4eaec]" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#e4eaec]">
              <Heart className="h-8 w-8 text-[#8fa0a8]" />
            </div>
            <p className="text-[15px] font-semibold text-[#1f2a30]">Nenhum shot encontrado</p>
            <p className="text-[13px] text-[#6a7a81]">Tente outra cidade ou categoria.</p>
          </div>
        ) : (
          items.map((item) => <ShotCard key={item.id} item={item} />)
        )}
      </div>
    </>
  );
}
