"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos come from uploaded URLs */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
} from "lucide-react";

type ReviewItem = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  professional?: {
    id: string;
    slug: string;
    displayName: string;
    city: string;
    state: string;
    image?: string | null;
    verified: boolean;
    escortCategory?: string | null;
  } | null;
};

type Professional = {
  id: string;
  slug: string;
  displayName: string;
  city: string;
  state: string;
  image?: string | null;
  verified: boolean;
  rating: number;
  totalReviews: number;
  escortCategory?: string | null;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-[#c9a84c] text-[#c9a84c]" : "text-[#d0d7da]"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const pro = review.professional;
  if (!pro) return null;

  return (
    <div className="client-card p-4">
      {/* Professional info */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-[#d4a843]/30 bg-[#1b1d1f]">
          {pro.image ? (
            <img src={pro.image} alt={pro.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[14px] font-black text-[#8b6b25]">
              {pro.displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-[14px] font-semibold text-[#f5f0e4]">{pro.displayName}</p>
            {pro.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#4d9b56]" />}
          </div>
          <p className="flex items-center gap-1 text-[12px] text-[#f5f0e4]/50">
            <MapPin className="h-3 w-3" />
            {pro.city}, {pro.state}
          </p>
        </div>
      </div>

      {/* Rating + comment */}
      <div className="mt-3">
        <StarRow rating={review.rating} />
        {review.comment ? (
          <p className="mt-2 text-[13px] leading-5 text-[#f5f0e4]/60 line-clamp-3">{review.comment}</p>
        ) : (
          <p className="mt-2 text-[13px] italic text-[#f5f0e4]/38">Sem comentário.</p>
        )}
      </div>

      {/* Date + CTA */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-[#f5f0e4]/38">
          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
            new Date(review.createdAt)
          )}
        </p>
        <Link
          href={`/profissionais/${pro.slug}`}
          className="flex items-center gap-1 text-[12px] font-semibold text-[#f5d78c] no-underline"
        >
          Ver acompanhante
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function RecommendCard({ p }: { p: Professional }) {
  return (
    <Link
      href={`/profissionais/${p.slug}`}
      className="client-panel-soft flex min-w-[140px] flex-col items-center p-3 no-underline"
    >
      <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#d4a843]/40 bg-[#1b1d1f]">
        {p.image ? (
          <img src={p.image} alt={p.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[16px] font-black text-[#8b6b25]">
            {p.displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <p className="mt-2 max-w-[120px] truncate text-center text-[13px] font-semibold text-[#f5f0e4]">
        {p.displayName}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <Star className="h-3 w-3 fill-[#c9a84c] text-[#c9a84c]" />
        <span className="text-[12px] font-semibold text-[#f5f0e4]">{p.rating.toFixed(1)}</span>
      </div>
    </Link>
  );
}

export default function AvaliacoesPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [recommended, setRecommended] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [stats, setStats] = useState({ total: 0, avgRating: 0 });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (city) qs.set("city", city);
        qs.set("limit", "20");

        const r = await fetch(`/api/reviews?${qs}`, { signal: controller.signal });
        const data = await r.json();
        const list: ReviewItem[] = Array.isArray(data) ? data : Array.isArray(data.reviews) ? data.reviews : [];
        setReviews(list);
        if (list.length > 0) {
          const avg = list.reduce((acc, item) => acc + (item.rating ?? 0), 0) / list.length;
          setStats({ total: list.length, avgRating: avg });
        }
      } catch {
        if (!controller.signal.aborted) setReviews([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    async function loadRecommended() {
      try {
        const qsPro = new URLSearchParams();
        if (city) qsPro.set("city", city);
        qsPro.set("sortBy", "rating");
        qsPro.set("limit", "8");
        const r = await fetch(`/api/professionals?${qsPro}`, { signal: controller.signal });
        const data = await r.json();
        const list: Professional[] = Array.isArray(data.professionals) ? data.professionals : [];
        setRecommended(list.slice(0, 8));
      } catch {
        if (!controller.signal.aborted) setRecommended([]);
      }
    }

    void load();
    void loadRecommended();
    return () => controller.abort();
  }, [city]);

  return (
    <>
      <section className="client-page-header">
        <p className="client-kicker">Confiança real</p>
        <h1 className="client-title mt-1">Avaliações</h1>
        <p className="client-subtitle mt-2">Veja experiências recentes e descubra perfis bem avaliados.</p>
      </section>

      {/* Sticky search */}
      <div className="sticky top-[116px] z-20 border-y border-[#d4a843]/10 bg-[#090a0b]/86 pb-3 pt-4 backdrop-blur-2xl">
        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4a843]" />
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="client-input h-[44px] w-full pl-9 pr-4 text-[14px]"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Stats */}
        {!loading && stats.total > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="client-panel-soft p-4 text-center">
              <p className="text-[26px] font-bold text-[#f5f0e4]">{stats.total}</p>
              <p className="mt-0.5 text-[12px] text-[#f5f0e4]/48">avaliações</p>
            </div>
            <div className="client-panel-soft p-4 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Star className="h-5 w-5 fill-[#c9a84c] text-[#c9a84c]" />
                <p className="text-[26px] font-bold text-[#f5f0e4]">{stats.avgRating.toFixed(1)}</p>
              </div>
              <p className="mt-0.5 text-[12px] text-[#f5f0e4]/48">média geral</p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommended.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#f5f0e4]">Mais bem avaliadas</h2>
              <Link href="/dashboard/acompanhantes" className="text-[13px] font-semibold text-[#f5d78c] no-underline">
                Ver todas
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recommended.map((p) => (
                <RecommendCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {/* Reviews list */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-[#f5f0e4]">
            <MessageSquare className="h-5 w-5 text-[#f5d78c]" />
            Avaliações recentes
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="premium-skeleton h-[130px] rounded-[8px]" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="client-empty flex flex-col items-center gap-3 px-5 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
                <ThumbsUp className="h-7 w-7 text-[#f5d78c]" />
              </div>
              <p className="text-[14px] font-semibold text-[#f5f0e4]">Nenhuma avaliação encontrada</p>
              <p className="text-[13px] text-[#f5f0e4]/54">
                {city ? `Não há avaliações em "${city}" ainda.` : "Seja o primeiro a avaliar!"}
              </p>
              <Link
                href="/dashboard/acompanhantes"
                className="client-secondary-button mt-2 min-h-0 px-5 py-2 text-[13px] no-underline"
              >
                Encontrar acompanhantes
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
