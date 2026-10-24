"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
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

const PROFESSIONALS_CACHE_TTL_MS = 60_000;
const professionalsCache = new Map<string, { expiresAt: number; data: Professional[] }>();
const professionalsRequests = new Map<string, Promise<Professional[]>>();

async function loadProfessionals(query: URLSearchParams, signal: AbortSignal) {
  const url = `/api/professionals?${query}`;
  const cached = professionalsCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const pending = professionalsRequests.get(url) ?? fetch(`/api/professionals?${query}`, { signal })
    .then((response) => response.ok ? response.json() : { professionals: [] })
    .then((data) => Array.isArray(data.professionals) ? data.professionals as Professional[] : [])
    .then((data) => {
      professionalsCache.set(url, { data, expiresAt: Date.now() + PROFESSIONALS_CACHE_TTL_MS });
      return data;
    })
    .finally(() => professionalsRequests.delete(url));

  professionalsRequests.set(url, pending);
  return pending;
}

export default function HomeDiscoveryPreview() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ sortBy: "recent", limit: "12" });
    void loadProfessionals(query, controller.signal)
      .then((data) => setProfessionals(data))
      .catch(() => {
        if (!controller.signal.aborted) setProfessionals([]);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="home-discovery">
      <div className="home-featured-heading"><div><Flame aria-hidden="true" /><span><h3>Profissionais em destaque</h3><p>Conheça perfis publicados recentemente.</p></span></div><Link href="/buscar?tab=acompanhantes">Ver todos</Link></div>

      {professionals.length > 0 ? (
        <div className="home-profile-row">
          {professionals.map((professional, index) => {
            const startingPrice = professionalStartingPrice(professional);
            return (
            <Link key={professional.id} href={`/profissionais/${professional.slug}`} className="home-profile-card">
              <div className="home-profile-photo">
                {professional.image ? (
                  <Image
                    src={controlledMediaVariantUrl(professional.image, "card")}
                    alt={professional.displayName}
                    fill
                    unoptimized={requiresDirectMediaDelivery(professional.image)}
                    sizes="(max-width: 640px) 66vw, 232px"
                    loading={index < 2 ? "eager" : "lazy"}
                    fetchPriority={index < 2 ? "high" : "low"}
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
            </Link>
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
