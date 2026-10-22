"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, MapPin } from "lucide-react";
import Stories from "@/components/Stories";
import { StoryRegionSelector, type StoryRegion } from "@/components/home/StoryRegionSelector";
import { requiresDirectMediaDelivery } from "@/lib/public-professional-media";
import {
  PUBLIC_LOCATION_EVENT,
  readPublicLocationPreference,
  type PublicLocationPreference,
} from "@/lib/public-location-preference";

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
  pricePerHour?: number | null;
};

export default function HomeDiscoveryPreview() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [location, setLocation] = useState<PublicLocationPreference | null>(null);
  const [storyRegion, setStoryRegion] = useState<StoryRegion | null>(null);
  const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
  const activeRegion = storyRegion ?? location;
  const viewAllHref = activeRegion
    ? `/buscar?tab=acompanhantes&cidade=${encodeURIComponent(activeRegion.city)}&estado=${activeRegion.state.toLowerCase()}`
    : "/buscar?tab=acompanhantes&selecionarCidade=1";

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedLocation = readPublicLocationPreference();
      if (savedLocation) {
        setProfessionals([]);
        setLocation(savedLocation);
        setStoryRegion(savedLocation);
      }
    }, 0);
    const handleLocationChange = (event: Event) => {
      setProfessionals([]);
      setLocation((event as CustomEvent<PublicLocationPreference | null>).detail);
      setStoryRegion((event as CustomEvent<PublicLocationPreference | null>).detail);
    };
    window.addEventListener(PUBLIC_LOCATION_EVENT, handleLocationChange);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener(PUBLIC_LOCATION_EVENT, handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ sortBy: "recent", limit: "12" });
    if (activeRegion) {
      query.set("city", activeRegion.city);
      query.set("state", activeRegion.state);
    }
    fetch(`/api/professionals?${query}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { professionals: [] })
      .then((data) => setProfessionals(data.professionals ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setProfessionals([]);
      });
    return () => controller.abort();
  }, [activeRegion]);

  return (
    <section className="home-discovery">
      <div className="home-discovery-head">
        <div>
          <span>Descoberta ao vivo</span>
          <h2>Perfis e stories em destaque</h2>
          <p>{activeRegion ? <><MapPin aria-hidden="true" /> <strong>{activeRegion.label}</strong><span aria-hidden="true"> · </span> Veja quem está online na região.</> : "Escolha uma cidade para explorar stories e profissionais publicadas."}</p>
        </div>
        <Link href={viewAllHref}>Ver todos</Link>
      </div>

      <div className="home-stories-heading"><h3>Stories</h3></div>
      <Stories key={`${activeRegion?.city ?? "all"}-${activeRegion?.state ?? "all"}`} city={activeRegion?.city} state={activeRegion?.state} onChooseRegion={() => setRegionSelectorOpen(true)} />

      <div className="home-featured-heading"><div><Flame aria-hidden="true" /><span><h3>Profissionais em destaque</h3><p>Conheça perfis publicados da região selecionada.</p></span></div><Link href={viewAllHref}>Ver todos</Link></div>

      {professionals.length > 0 ? (
        <div className="home-profile-row">
          {professionals.map((professional) => (
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
                <b>{professional.priceMin ?? professional.pricePerHour ? `R$ ${(professional.priceMin ?? professional.pricePerHour)!.toLocaleString("pt-BR")}/h` : "Consultar"}</b>
              </div>
            </Link>
          ))}
        </div>
      ) : activeRegion ? (
        <div className="home-region-empty" role="status">
          <p>Nenhum perfil público disponível em {activeRegion.label} neste momento.</p>
          <button type="button" onClick={() => setRegionSelectorOpen(true)}>Escolher outra cidade</button>
        </div>
      ) : null}

      <StoryRegionSelector open={regionSelectorOpen} current={activeRegion} onClose={() => setRegionSelectorOpen(false)} onSelect={setStoryRegion} />

      <style>{`
        .home-discovery{max-width:1280px;margin:0 auto;padding:54px 24px 34px;background:linear-gradient(145deg,#fff 0%,#fbf7fe 55%,#f3eafb 100%);color:#25112f}
        .home-discovery-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px}
        .home-discovery-head span{color:#b72cff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}
        .home-discovery-head h2{margin:8px 0 8px;font:800 clamp(26px,4vw,42px)/1.08 var(--font-playfair),serif;color:#24102f}
        .home-discovery-head p{display:flex;align-items:center;gap:7px;margin:0;color:#75677d;line-height:1.5}.home-discovery-head p svg{width:18px;color:#861fa8}.home-discovery-head p strong{color:#30173b}
        .home-discovery-head>a{flex:0 0 auto;color:#b72cff;font-weight:900;text-decoration:none}
        .home-profile-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,260px);gap:16px;overflow-x:auto;padding:4px 0 20px;scroll-snap-type:x proximity}
        .home-profile-card{scroll-snap-align:start;overflow:hidden;border:1px solid #eadcf1;border-radius:18px;background:#fff;color:#291335;text-decoration:none;box-shadow:0 16px 44px rgba(76,29,102,.12);transition:.2s ease}
        .home-profile-card:hover{transform:translateY(-3px);border-color:rgba(183, 44, 255,.45)}
        .home-profile-photo{position:relative;aspect-ratio:4/5;background:linear-gradient(135deg,#17130b,#0b0b0b);overflow:hidden}
        .home-profile-gradient{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),transparent 48%)}
        .home-profile-badges{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}
        .home-profile-badges span{border:1px solid rgba(183, 44, 255,.3);border-radius:999px;background:rgba(5,5,5,.78);padding:4px 8px;color:#e1a6ff;font-size:10px;font-weight:900}
        .home-profile-copy{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:14px}
        .home-profile-copy strong{font:800 18px var(--font-playfair),serif}
        .home-profile-copy p{margin:3px 0 0;color:#75677d;font-size:12px}
        .home-profile-copy>span{align-self:start;color:#777;font-size:11px;font-weight:800}
        .home-profile-copy>span.is-online{color:#34d399}
        .home-profile-copy small{color:#b72cff}
        .home-profile-copy b{text-align:right;color:#e1a6ff;font-size:12px}
        .home-stories-heading h3,.home-featured-heading h3{margin:0;color:#291335;font:800 25px var(--font-playfair),serif}.home-stories-heading{margin:4px 0 2px}.home-featured-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:22px 0 16px;padding-top:22px;border-top:1px solid #e9dcef}.home-featured-heading>div{display:flex;align-items:center;gap:10px}.home-featured-heading>div>svg{width:26px;height:26px;color:#8e24aa;fill:#8e24aa}.home-featured-heading p{margin:3px 0 0;color:#786a80;font-size:13px}.home-featured-heading>a{color:#7b1fa2;font-weight:900;text-decoration:none}
        .home-region-empty{margin:8px 0 20px;border:1px solid #e5d4ee;border-radius:16px;padding:18px;color:#675b6d;background:#fff}
        .home-region-empty p{margin:0 0 12px}
        .home-region-empty button{min-height:42px;border:1px solid #9c3cba;border-radius:999px;padding:0 16px;background:#fff;color:#781d99;font-weight:900;cursor:pointer}
        @media(max-width:640px){.home-discovery{padding:36px 16px 22px;overflow:hidden}.home-discovery-head{align-items:start;margin-bottom:18px}.home-discovery-head h2{font-size:31px}.home-discovery-head p{font-size:13px;flex-wrap:wrap}.home-profile-row{grid-auto-columns:72vw;margin-right:-16px;padding-right:16px}.home-featured-heading h3{font-size:23px}.home-featured-heading p{font-size:12px}.home-featured-heading>a{font-size:13px}}
      `}</style>
    </section>
  );
}
