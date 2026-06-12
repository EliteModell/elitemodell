"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Stories from "@/components/Stories";

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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/professionals?sortBy=relevance&limit=8", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { professionals: [] })
      .then((data) => setProfessionals(data.professionals ?? []))
      .catch(() => setProfessionals([]));
    return () => controller.abort();
  }, []);

  return (
    <section className="home-discovery">
      <div className="home-discovery-head">
        <div>
          <span>Descoberta ao vivo</span>
          <h2>Perfis e stories em destaque</h2>
          <p>Explore antes de criar uma conta. Entre apenas quando quiser salvar, avaliar ou conversar.</p>
        </div>
        <Link href="/buscar?tab=acompanhantes">Ver todos</Link>
      </div>

      <Stories />

      {professionals.length > 0 ? (
        <div className="home-profile-row">
          {professionals.map((professional) => (
            <Link key={professional.id} href={`/profissionais/${professional.slug}`} className="home-profile-card">
              <div className="home-profile-photo">
                {professional.image ? (
                  <Image src={professional.image} alt={professional.displayName} fill sizes="240px" style={{ objectFit: "cover" }} />
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
      ) : null}

      <style>{`
        .home-discovery{max-width:1280px;margin:0 auto;padding:64px 24px 20px;background:#050505}
        .home-discovery-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px}
        .home-discovery-head span{color:#d4a843;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}
        .home-discovery-head h2{margin:8px 0 4px;font:800 clamp(26px,4vw,42px)/1.08 var(--font-playfair),serif;color:#f4f1ea}
        .home-discovery-head p{margin:0;color:#9d968c;line-height:1.6}
        .home-discovery-head>a{flex:0 0 auto;color:#d4a843;font-weight:900;text-decoration:none}
        .home-profile-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,260px);gap:16px;overflow-x:auto;padding:4px 0 20px;scroll-snap-type:x proximity}
        .home-profile-card{scroll-snap-align:start;overflow:hidden;border:1px solid rgba(212,168,67,.18);border-radius:16px;background:#0d0d0d;color:#f4f1ea;text-decoration:none;box-shadow:0 22px 64px rgba(0,0,0,.32);transition:.2s ease}
        .home-profile-card:hover{transform:translateY(-3px);border-color:rgba(212,168,67,.45)}
        .home-profile-photo{position:relative;aspect-ratio:4/5;background:linear-gradient(135deg,#17130b,#0b0b0b);overflow:hidden}
        .home-profile-gradient{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),transparent 48%)}
        .home-profile-badges{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}
        .home-profile-badges span{border:1px solid rgba(212,168,67,.3);border-radius:999px;background:rgba(5,5,5,.78);padding:4px 8px;color:#f5d78c;font-size:10px;font-weight:900}
        .home-profile-copy{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:14px}
        .home-profile-copy strong{font:800 18px var(--font-playfair),serif}
        .home-profile-copy p{margin:3px 0 0;color:#8f8980;font-size:12px}
        .home-profile-copy>span{align-self:start;color:#777;font-size:11px;font-weight:800}
        .home-profile-copy>span.is-online{color:#34d399}
        .home-profile-copy small{color:#d4a843}
        .home-profile-copy b{text-align:right;color:#f5d78c;font-size:12px}
        @media(max-width:640px){.home-discovery{padding:46px 16px 10px}.home-discovery-head{align-items:start}.home-discovery-head p{font-size:13px}.home-profile-row{grid-auto-columns:78vw}}
      `}</style>
    </section>
  );
}
