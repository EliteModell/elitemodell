"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Grid2X2, LockKeyhole, MapPin, Settings2, ShieldCheck, User, VenusAndMars } from "lucide-react";
import { ClientSensitiveGate } from "@/components/client-area/ClientSensitiveGate";

const categories = [
  { label: "Todas", icon: <Grid2X2 /> },
  { label: "Mulheres", icon: <User /> },
  { label: "Homens", icon: <User /> },
  { label: "Trans", icon: <VenusAndMars /> },
];

export default function ShotsPage() {
  const [activeCategory, setActiveCategory] = useState("Todas");

  useEffect(() => {
    delete document.body.dataset.clientExplore;
    delete document.body.dataset.clientFiltersOpen;
    return () => {
      delete document.body.dataset.clientFiltersOpen;
    };
  }, []);

  return (
    <section className="shots-page">
      <Link href="/dashboard/selecionar-cidade" className="shots-search-bar">
        <MapPin />
        <span>Buscar cidade</span>
        <Settings2 />
      </Link>

      <section className="shots-hero">
        <div className="shots-hero-copy">
          <p>SHOTS</p>
          <h1>
            Em breve,<br />
            <span>shots incríveis</span><br />
            perto de você.
          </h1>
          <strong>Estamos quase prontos! Complete seu perfil e desbloqueie fotos e vídeos reais da sua cidade.</strong>
        </div>
      </section>

      <section className="shots-filter-card">
        <div className="shots-category">
          <span>Explorar por categoria</span>
          <div>
            {categories.map((category) => (
              <button
                key={category.label}
                type="button"
                className={activeCategory === category.label ? "active" : undefined}
                aria-pressed={activeCategory === category.label}
                onClick={() => setActiveCategory(category.label)}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ClientSensitiveGate fallbackTitle="Shots restritos">
        <section className="shots-empty-card">
          <p className="shots-eyebrow">ACESSO PRIVADO</p>
          <h2>Em breve, shots da sua cidade.</h2>
          <p>Estamos preparando uma experiência exclusiva, real e segura para você.</p>
          <Link href="/dashboard/perfil" className="shots-primary-button">
            Complete seu perfil
            <ChevronRight />
          </Link>
        </section>
      </ClientSensitiveGate>

      <section className="shots-featured" aria-labelledby="shots-featured-title">
        <div className="shots-section-heading">
          <div>
            <p>CONTEÚDO PREMIUM</p>
            <h2 id="shots-featured-title">Shots em destaque</h2>
          </div>
          <span>Ver todos <ChevronRight /></span>
        </div>
        <div className="shots-featured-track">
          {["one", "two", "three"].map((item, index) => (
            <article key={item} className={`shots-preview-card shots-preview-card--${item}`}>
              <div className="shots-preview-lock"><LockKeyhole /></div>
              <div className="shots-preview-copy">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>Prévia protegida</strong>
                <p>Disponível após verificação</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="shots-safety-card">
        <span><ShieldCheck /></span>
        <div>
          <h2>Só conteúdos reais e verificados</h2>
          <p>Segurança, privacidade e respeito em primeiro lugar.</p>
        </div>
        <Link href="/dashboard/informacoes">
          Saiba mais
          <ChevronRight />
        </Link>
      </section>
    </section>
  );
}
