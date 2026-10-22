"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Flame, MapPin } from "lucide-react";
import Stories from "@/components/Stories";
import { StoryRegionSelector, type StoryRegion } from "@/components/home/StoryRegionSelector";
import { requiresDirectMediaDelivery } from "@/lib/public-professional-media";
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

export default function HomeDiscoveryPreview() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [storyRegion, setStoryRegion] = useState<StoryRegion | null>(null);
  const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
  const viewAllHref = storyRegion?.kind === "city"
    ? `/buscar?tab=acompanhantes&cidade=${encodeURIComponent(storyRegion.city!)}&estado=${storyRegion.state.toLowerCase()}`
    : storyRegion?.kind === "state"
      ? `/buscar?tab=acompanhantes&estado=${storyRegion.state.toLowerCase()}`
      : "/buscar?tab=acompanhantes";

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ sortBy: "recent", limit: "12" });
    if (storyRegion) {
      if (storyRegion.city) query.set("city", storyRegion.city);
      query.set("state", storyRegion.state);
    }
    fetch(`/api/professionals?${query}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { professionals: [] })
      .then((data) => setProfessionals(data.professionals ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setProfessionals([]);
      });
    return () => controller.abort();
  }, [storyRegion]);

  return (
    <section className="home-discovery">
      <div className="home-discovery-head">
        <div>
          <span>● Ao vivo</span>
          <h2>Stories e perfis da região</h2>
        </div>
        <button type="button" className="home-region-filter" onClick={() => setRegionSelectorOpen(true)}><MapPin aria-hidden="true" /><span>{storyRegion?.label ?? "Todas as regiões"}</span><ChevronDown aria-hidden="true" /></button>
      </div>

      <Stories key={`${storyRegion?.kind ?? "all"}-${storyRegion?.city ?? "all"}-${storyRegion?.state ?? "all"}`} city={storyRegion?.city} state={storyRegion?.state} />

      <div className="home-featured-heading"><div><Flame aria-hidden="true" /><span><h3>Profissionais em destaque</h3><p>Conheça perfis publicados da região selecionada.</p></span></div><Link href={viewAllHref}>Ver todos</Link></div>

      {professionals.length > 0 ? (
        <div className="home-profile-row">
          {professionals.map((professional) => {
            const startingPrice = professionalStartingPrice(professional);
            return (
            <Link key={professional.id} href={`/profissionais/${professional.slug}`} className="home-profile-card">
              <div className="home-profile-photo">
                {professional.image ? (
                  <Image src={professional.image} alt={professional.displayName} fill unoptimized={requiresDirectMediaDelivery(professional.image)} sizes="240px" style={{ objectFit: "cover" }} />
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
      ) : storyRegion ? (
        <div className="home-region-empty" role="status">
          <p>Nenhum perfil público disponível em {storyRegion.label} neste momento.</p>
          <button type="button" onClick={() => setRegionSelectorOpen(true)}>Escolher outra cidade</button>
        </div>
      ) : null}

      <StoryRegionSelector open={regionSelectorOpen} current={storyRegion} onClose={() => setRegionSelectorOpen(false)} onSelect={setStoryRegion} />

      <style>{`
        .home-discovery{max-width:1280px;margin:0 auto;padding:30px 24px 28px;background:linear-gradient(145deg,#fff 0%,#fbf7fe 55%,#f3eafb 100%);color:#25112f}
        .home-discovery-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:6px}
        .home-discovery-head span{color:#b72cff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}
        .home-discovery-head h2{margin:6px 0 0;font:800 clamp(24px,3.4vw,36px)/1.08 var(--font-playfair),serif;color:#24102f}
        .home-region-filter{max-width:260px;min-height:44px;display:flex;align-items:center;gap:8px;border:1px solid #ddc8e9;border-radius:999px;padding:0 15px;background:rgba(255,255,255,.82);color:#781d99;font-weight:850;cursor:pointer}.home-region-filter svg{width:18px;flex:0 0 auto}.home-region-filter span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .home-profile-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(200px,232px);gap:14px;overflow-x:auto;padding:2px 0 12px;scroll-snap-type:x proximity}
        .home-profile-card{scroll-snap-align:start;overflow:hidden;border:1px solid #eadcf1;border-radius:18px;background:#fff;color:#291335;text-decoration:none;box-shadow:0 16px 44px rgba(76,29,102,.12);transition:.2s ease}
        .home-profile-card:hover{transform:translateY(-3px);border-color:rgba(183, 44, 255,.45)}
        .home-profile-photo{position:relative;aspect-ratio:4/5;background:linear-gradient(135deg,#17130b,#0b0b0b);overflow:hidden}
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
        .home-featured-heading h3{margin:0;color:#291335;font:800 24px var(--font-playfair),serif}.home-featured-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:14px 0 12px;padding-top:15px;border-top:1px solid #e9dcef}.home-featured-heading>div{display:flex;align-items:center;gap:9px}.home-featured-heading>div>svg{width:24px;height:24px;color:#8e24aa;fill:#8e24aa}.home-featured-heading p{margin:2px 0 0;color:#786a80;font-size:12px}.home-featured-heading>a{color:#7b1fa2;font-size:13px;font-weight:900;text-decoration:none}
        .home-region-empty{margin:8px 0 20px;border:1px solid #e5d4ee;border-radius:16px;padding:18px;color:#675b6d;background:#fff}
        .home-region-empty p{margin:0 0 12px}
        .home-region-empty button{min-height:42px;border:1px solid #9c3cba;border-radius:999px;padding:0 16px;background:#fff;color:#781d99;font-weight:900;cursor:pointer}
        @media(max-width:640px){.home-discovery{padding:24px 14px 18px;overflow:hidden}.home-discovery-head{align-items:center;margin-bottom:4px}.home-discovery-head h2{font-size:23px;max-width:220px}.home-discovery-head>div>span{font-size:10px}.home-region-filter{max-width:168px;min-height:40px;padding:0 11px;font-size:12px}.home-profile-row{grid-auto-columns:66vw;margin-right:-14px;padding-right:14px}.home-featured-heading h3{font-size:21px}.home-featured-heading p{font-size:11px}.home-featured-heading>a{font-size:12px}}
      `}</style>
    </section>
  );
}
