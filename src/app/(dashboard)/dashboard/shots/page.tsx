"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Clapperboard, Grid2X2, MapPin, Search, Settings2, ShieldCheck, User, VenusAndMars } from "lucide-react";

const categories = [
  { label: "Todas", icon: <Grid2X2 /> },
  { label: "Mulheres", icon: <User /> },
  { label: "Homens", icon: <User /> },
  { label: "Trans", icon: <VenusAndMars /> },
];

export default function ShotsPage() {
  useEffect(() => {
    delete document.body.dataset.clientExplore;
    delete document.body.dataset.clientFiltersOpen;
    return () => {
      delete document.body.dataset.clientFiltersOpen;
    };
  }, []);

  return (
    <section className="shots-page">
      <button type="button" className="shots-search-bar">
        <MapPin />
        <span>Buscar cidade</span>
        <Settings2 />
      </button>

      <section className="shots-hero">
        <p>SHOTS</p>
        <h1>
          Em breve,<br />
          <span>shots</span> incríveis<br />
          perto de você.
        </h1>
        <strong>Estamos quase prontos! Complete seu perfil e desbloqueie fotos e vídeos reais da sua cidade.</strong>
      </section>

      <section className="shots-filter-card">
        <p>FILTRAR SHOTS</p>
        <label>
          <span>Cidade</span>
          <div className="shots-input">
            <Search />
            <input type="text" placeholder="Digite uma cidade" />
          </div>
        </label>

        <div className="shots-category">
          <span>Categoria</span>
          <div>
            {categories.map((category, index) => (
              <button key={category.label} type="button" className={index === 0 ? "active" : undefined}>
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="shots-empty-card">
        <div className="shots-empty-icon">
          <Clapperboard />
        </div>
        <h2>
          Em breve, shots<br />
          da sua cidade.
        </h2>
        <p>Estamos preparando uma experiência incrível para você.</p>
        <Link href="/dashboard/perfil" className="shots-primary-button">
          Complete seu perfil
          <ChevronRight />
        </Link>
      </section>

      <section className="shots-safety-card">
        <span>
          <ShieldCheck />
        </span>
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
