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

function EmptyShotPreview() {
  return (
    <div className="client-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.045]" />
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-white/[0.08]" />
          <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
        </div>
      </div>
      <div className="grid aspect-square place-items-center bg-[#101214]/86">
        <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
          <Camera className="h-8 w-8" />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-3.5 w-36 rounded-full bg-white/[0.07]" />
      </div>
    </div>
  );
}

function EmptyShotsState() {
  return (
    <div className="space-y-4">
      <section className="client-empty px-5 py-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[18px] font-bold text-[#f5f0e4]">Quando houver publicacoes, elas aparecerao aqui</h2>
        <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-5 text-[#f5f0e4]/54">
          Shots reais de perfis disponiveis na sua cidade serao exibidos nesta area.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="client-primary-button mx-auto mt-5 inline-flex min-h-0 items-center gap-2 px-5 py-2.5 text-[13px] no-underline"
        >
          Explorar acompanhantes
        </Link>
      </section>

      <section>
        <p className="mb-3 text-[12px] font-bold uppercase text-[#f5f0e4]/42">Preview da vitrine</p>
        <EmptyShotPreview />
      </section>
    </div>
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
      <section className="px-4 pb-4 pt-5">
        <p className="client-kicker">Feed visual</p>
        <h1 className="client-title mt-1">Shots</h1>
        <p className="client-subtitle mt-1.5">Fotos de perfis verificados por cidade.</p>
      </section>

      <div className="sticky top-[110px] z-20 border-y border-white/[0.07] bg-[#07090a]/94 pb-2.5 pt-2.5 backdrop-blur-2xl">
        <div className="px-4">
          <div className="relative mb-2.5">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
            <input
              type="text"
              placeholder="Filtrar por cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="client-input h-[38px] w-full pl-10 pr-4 text-[13px]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  activeFilter === f.value ? "client-chip-active" : "client-chip"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-[calc(170px+env(safe-area-inset-bottom))] pt-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <ShotSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyShotsState />
        ) : (
          <div className="space-y-4">
            {items.map((item) => <ShotCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </>
  );
}
