"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
import ProfessionalProfileLink from "@/components/professionals/ProfessionalProfileLink";
import { controlledMediaVariantUrl, requiresDirectMediaDelivery } from "@/lib/public-professional-media";
import { professionalStartingPrice } from "@/lib/professional-pricing";

type Professional = {
  id: string;
  slug: string;
  displayName: string;
  city: string;
  state: string;
  image: string | null;
  verified: boolean;
  online: boolean;
  sponsored: boolean;
  rating: number;
  totalReviews: number;
  priceMin?: number | null;
  price15min?: number | null;
  price30min?: number | null;
  pricePerHour?: number | null;
  price2h?: number | null;
  priceOvernight?: number | null;
  priceWebcam?: number | null;
};

const HOME_SCROLL_STORAGE_KEY = "elite_home_professionals_scroll:v1";
const HOME_PROFESSIONALS_QUERY = new URLSearchParams({ sortBy: "recent", limit: "12", placement: "home" });

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toPublicCardProfessional(value: unknown): Professional | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string"
    || typeof candidate.slug !== "string"
    || typeof candidate.displayName !== "string"
    || typeof candidate.city !== "string"
    || typeof candidate.state !== "string"
  ) return null;

  return {
    id: candidate.id,
    slug: candidate.slug,
    displayName: candidate.displayName,
    city: candidate.city,
    state: candidate.state,
    image: typeof candidate.image === "string" && candidate.image.startsWith("/api/media/")
      ? candidate.image
      : null,
    verified: candidate.verified === true,
    online: candidate.online === true,
    sponsored: candidate.sponsored === true,
    rating: optionalNumber(candidate.rating) ?? 0,
    totalReviews: optionalNumber(candidate.totalReviews) ?? 0,
    priceMin: optionalNumber(candidate.priceMin),
    price15min: optionalNumber(candidate.price15min),
    price30min: optionalNumber(candidate.price30min),
    pricePerHour: optionalNumber(candidate.pricePerHour),
    price2h: optionalNumber(candidate.price2h),
    priceOvernight: optionalNumber(candidate.priceOvernight),
    priceWebcam: optionalNumber(candidate.priceWebcam),
  };
}

function sanitizePublicCardProfessionals(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(toPublicCardProfessional).filter((item): item is Professional => item !== null);
}

async function loadProfessionals(query: URLSearchParams, signal: AbortSignal) {
  return fetch(`/api/professionals?${query}`, { signal, cache: "no-store" })
    .then((response) => response.ok ? response.json() : { professionals: [] })
    .then((data) => sanitizePublicCardProfessionals(data.professionals));
}

export default function HomeDiscoveryPreview() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [preparedThrough, setPreparedThrough] = useState(3);
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfessionals(HOME_PROFESSIONALS_QUERY, controller.signal)
      .then((data) => setProfessionals(data))
      .catch(() => {
        if (!controller.signal.aborted) setProfessionals([]);
      });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || professionals.length === 0) return;
    try {
      const saved = Number(window.sessionStorage.getItem(HOME_SCROLL_STORAGE_KEY) ?? 0);
      if (Number.isFinite(saved) && saved > 0) row.scrollLeft = saved;
    } catch {
      // Native browser restoration remains the fallback.
    }
  }, [professionals.length]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  function prepareUpcomingCards() {
    const row = rowRef.current;
    if (!row) return;
    try {
      window.sessionStorage.setItem(HOME_SCROLL_STORAGE_KEY, String(row.scrollLeft));
    } catch {
      // Scroll persistence is an enhancement only.
    }
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const card = row.querySelector<HTMLElement>(".home-profile-card");
      if (!card) return;
      const cardStride = card.getBoundingClientRect().width + 14;
      const lastVisible = Math.ceil((row.scrollLeft + row.clientWidth) / cardStride) - 1;
      setPreparedThrough((current) => Math.min(professionals.length - 1, Math.max(current, lastVisible + 2)));
    });
  }

  return (
    <section className="home-discovery">
      <div className="home-featured-heading"><div><Flame aria-hidden="true" /><span><h3>Profissionais em destaque</h3><p>Conheça perfis publicados recentemente.</p></span></div><Link href="/buscar?tab=acompanhantes">Ver todos</Link></div>

      {professionals.length > 0 ? (
        <div ref={rowRef} className="home-profile-row" onScroll={prepareUpcomingCards}>
          {professionals.map((professional, index) => {
            const startingPrice = professionalStartingPrice(professional);
            return (
            <ProfessionalProfileLink
              key={professional.id}
              preview={{
                slug: professional.slug,
                displayName: professional.displayName,
                image: professional.image,
                city: professional.city,
                state: professional.state,
              }}
              className="home-profile-card"
            >
              <div className="home-profile-photo">
                {professional.image ? (
                  <Image
                    src={controlledMediaVariantUrl(professional.image, "card")}
                    alt={professional.displayName}
                    fill
                    unoptimized={requiresDirectMediaDelivery(professional.image)}
                    sizes="(max-width: 640px) 66vw, 232px"
                    loading={index <= preparedThrough ? "eager" : "lazy"}
                    fetchPriority={index < 2 ? "high" : "auto"}
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
                <div className="home-profile-gradient" />
                <div className="home-profile-badges">
                  {professional.sponsored ? <span>Patrocinado</span> : null}
                  {professional.verified ? <span>Verificada</span> : null}
                </div>
              </div>
              <div className="home-profile-copy">
                <div>
                  <strong>{professional.displayName}</strong>
                  <p>{professional.city}, {professional.state}</p>
                </div>
                <span className={professional.online ? "is-online" : ""}>{professional.online ? "Online" : "Offline"}</span>
                <small>★ {(professional.rating ?? 0).toFixed(1)} ({professional.totalReviews ?? 0})</small>
                <b>{startingPrice ? `A partir de R$ ${startingPrice.value.toLocaleString("pt-BR")} · ${startingPrice.shortLabel}` : "Consultar"}</b>
              </div>
            </ProfessionalProfileLink>
            );
          })}
        </div>
      ) : null}

      <style>{`
        .home-discovery{max-width:1280px;margin:0 auto;padding:30px 24px 8px;background:linear-gradient(145deg,#fff 0%,#fbf7fe 55%,#f3eafb 100%);color:#25112f}
        .home-profile-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(200px,232px);gap:14px;overflow-x:auto;padding:2px 0 12px;scroll-snap-type:x proximity}
        .home-profile-card{scroll-snap-align:start;overflow:hidden;border:1px solid #eadcf1;border-radius:18px;background:#fff;color:#291335;text-decoration:none;box-shadow:0 16px 44px rgba(76,29,102,.12);transition:.2s ease}
        .home-profile-card:hover{transform:translateY(-3px);border-color:rgba(183, 44, 255,.45)}
        .home-profile-photo{position:relative;aspect-ratio:4/5;background:radial-gradient(circle at 72% 24%,rgba(225,166,255,.72),transparent 28%),linear-gradient(145deg,#f8eefc,#ead6f3 52%,#dcbbe9);overflow:hidden}
        .home-profile-gradient{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),transparent 48%)}
        .home-profile-badges{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}
        .home-profile-badges span{border:1px solid rgba(183, 44, 255,.3);border-radius:999px;background:rgba(5,5,5,.78);padding:4px 8px;color:#e1a6ff;font-size:10px;font-weight:900}
        .home-profile-copy{display:grid;grid-template-columns:1fr auto;gap:5px 9px;padding:11px 12px}
        .home-profile-copy strong{font:800 18px var(--font-playfair),serif}
        .home-profile-copy p{margin:3px 0 0;color:#75677d;font-size:12px}
        .home-profile-copy>span{align-self:start;color:#777;font-size:11px;font-weight:800}
        .home-profile-copy>span.is-online{color:#34d399}
        .home-profile-copy small{color:#b72cff}
        .home-profile-copy b{text-align:right;color:#e1a6ff;font-size:12px}
        .home-featured-heading h3{margin:0;color:#291335;font:800 24px var(--font-playfair),serif}.home-featured-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 12px}.home-featured-heading>div{display:flex;align-items:center;gap:9px}.home-featured-heading>div>svg{width:24px;height:24px;color:#8e24aa;fill:#8e24aa}.home-featured-heading p{margin:2px 0 0;color:#786a80;font-size:12px}.home-featured-heading>a{color:#7b1fa2;font-size:13px;font-weight:900;text-decoration:none}
        @media(max-width:640px){.home-discovery{padding:24px 14px 8px;overflow:hidden}.home-profile-row{grid-auto-columns:66vw;margin-right:-14px;padding-right:14px}.home-featured-heading h3{font-size:21px}.home-featured-heading p{font-size:11px}.home-featured-heading>a{font-size:12px}}
      `}</style>
    </section>
  );
}
