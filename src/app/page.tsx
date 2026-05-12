"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Camera,
  ChevronRight,
  Fingerprint,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";
import BottomNav from "@/components/BottomNav";
import { mockProfiles } from "@/lib/mockProfiles";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const cities = ["São Paulo", "Rio de Janeiro", "Curitiba", "Florianópolis", "Belo Horizonte"];

const properties = [
  {
    id: 1,
    title: "Cobertura Jardins",
    city: "São Paulo, SP",
    price: 890,
    image: "/hero-model.jpeg",
    type: "Cobertura",
    details: "3 quartos · piscina · check-in discreto",
  },
  {
    id: 2,
    title: "Flat Executivo",
    city: "Rio de Janeiro, RJ",
    price: 650,
    image: "/model2.jpg",
    type: "Flat",
    details: "1 suíte · garagem · portaria 24h",
  },
  {
    id: 3,
    title: "Studio Reservado",
    city: "Curitiba, PR",
    price: 420,
    image: "/model1.jpg",
    type: "Studio",
    details: "Local central · privacidade · Wi-Fi",
  },
];

const verificationItems = [
  { icon: ShieldCheck, title: "Documento privado", text: "Análise interna de identidade antes da publicação." },
  { icon: Camera, title: "Fotos reais", text: "Galeria revisada para reduzir perfis falsos." },
  { icon: Fingerprint, title: "Biometria facial", text: "Liveness e desafio de verificação para anunciantes." },
];

const categories = [
  { label: "Mulheres", href: "/buscar?tab=acompanhantes&sub=mulheres", total: "perfis femininos verificados" },
  { label: "Trans", href: "/buscar?tab=acompanhantes&sub=trans", total: "perfis trans com moderação" },
  { label: "Homens", href: "/buscar?tab=acompanhantes&sub=homens", total: "acompanhantes masculinos" },
  { label: "Imóveis", href: "/buscar?tab=imoveis", total: "locais reservados e avaliados" },
];

export default function HomePage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("mulheres");

  const featuredProfiles = useMemo(
    () => mockProfiles.filter((profile) => profile.verified).slice(0, 3),
    []
  );

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set("tab", category === "imoveis" ? "imoveis" : "acompanhantes");
    if (category !== "imoveis") params.set("sub", category);
    if (city.trim()) params.set("q", city.trim());
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <div className="home-shell">
      <AgeGate />
      <Navbar />

      <main>
        <section className="market-hero">
          <div className="hero-media" aria-hidden="true">
            <img src="/model.jpeg" alt="" />
            <div className="hero-shade" />
          </div>

          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={14} />
                Marketplace adulto verificado
              </div>
              <h1>Encontre companhia e locais reservados com discrição.</h1>
              <p>
                Perfis profissionais, imóveis selecionados e um fluxo de verificação com documento,
                fotos reais e biometria facial antes da publicação.
              </p>

              <form className="search-console" onSubmit={submitSearch}>
                <div className="field field-large">
                  <span>Cidade</span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="São Paulo, Rio, Curitiba..."
                    list="home-cities"
                  />
                  <datalist id="home-cities">
                    {cities.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <span>Categoria</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="mulheres">Mulheres</option>
                    <option value="trans">Trans</option>
                    <option value="homens">Homens</option>
                    <option value="imoveis">Imóveis</option>
                  </select>
                </div>

                <button type="submit" aria-label="Buscar">
                  <Search size={18} />
                  Buscar
                </button>
              </form>

              <div className="trust-strip">
                <span><BadgeCheck size={15} /> Perfis verificados</span>
                <span><Fingerprint size={15} /> Biometria facial</span>
                <span><ShieldCheck size={15} /> Dados privados</span>
              </div>
            </div>

            <aside className="live-board" aria-label="Perfis em destaque">
              <div className="board-head">
                <div>
                  <span>Em destaque agora</span>
                  <strong>Profissionais verificadas</strong>
                </div>
                <Link href="/buscar?tab=acompanhantes">
                  Ver todas <ChevronRight size={14} />
                </Link>
              </div>

              <div className="stacked-profiles">
                {featuredProfiles.map((profile) => (
                  <Link key={profile.id} href={`/profissionais/${profile.slug}`} className="compact-profile">
                    <img src={profile.image} alt={profile.displayName} />
                    <div>
                      <div className="profile-name">
                        <strong>{profile.displayName}</strong>
                        {profile.online && <span>online</span>}
                      </div>
                      <p>{profile.city}, {profile.state} · {profile.idade} anos</p>
                      <div className="profile-meta">
                        <span><Star size={12} fill={GOLD} /> {profile.rating}</span>
                        <span>R$ {profile.priceMin}/h</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="quick-categories">
          <div className="section-head">
            <span>Entrada rápida</span>
            <h2>Escolha o que você procura</h2>
          </div>
          <div className="category-grid">
            {categories.map((item) => (
              <Link key={item.label} href={item.href} className="category-tile">
                <span>{item.label}</span>
                <p>{item.total}</p>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        </section>

        <section className="production-section">
          <div className="section-head">
            <span>Seleção real</span>
            <h2>Perfis que parecem vivos, não placeholders</h2>
          </div>

          <div className="profile-grid">
            {featuredProfiles.map((profile) => (
              <Link key={profile.id} href={`/profissionais/${profile.slug}`} className="feature-card">
                <div className="photo-wrap">
                  <img src={profile.image} alt={profile.displayName} />
                  <div className="photo-gradient" />
                  <div className="verified-pill">
                    <UserRoundCheck size={13} />
                    Verificada
                  </div>
                  {profile.online && <div className="online-pill">Online agora</div>}
                </div>
                <div className="feature-info">
                  <div>
                    <h3>{profile.displayName}</h3>
                    <p><MapPin size={13} /> {profile.city}, {profile.state}</p>
                  </div>
                  <div className="price-line">
                    <span>R$ {profile.priceMin}/h</span>
                    <small><Star size={13} fill={GOLD} /> {profile.rating} ({profile.totalReviews})</small>
                  </div>
                  <div className="tag-row">
                    {profile.specialties.slice(0, 3).map((specialty) => (
                      <span key={specialty}>{specialty}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="verification-band">
          <div className="verification-copy">
            <span>Verificação Elite Modell</span>
            <h2>Documento, fotos reais e biometria antes do perfil ir ao ar.</h2>
            <p>
              O cadastro profissional já nasce com análise manual e suporte para provedor KYC.
              Isso reduz perfis falsos e deixa a plataforma com confiança de produto sério.
            </p>
          </div>
          <div className="verification-grid">
            {verificationItems.map(({ icon: Icon, title, text }) => (
              <div key={title} className="verify-item">
                <Icon size={22} />
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="property-section">
          <div className="section-head">
            <span>Locais selecionados</span>
            <h2>Imóveis para encontros discretos e estadias premium</h2>
          </div>

          <div className="property-grid">
            {properties.map((property) => (
              <Link key={property.id} href={`/imoveis/${property.id}`} className="property-card">
                <img src={property.image} alt={property.title} />
                <div className="property-info">
                  <span>{property.type}</span>
                  <h3>{property.title}</h3>
                  <p>{property.city}</p>
                  <small>{property.details}</small>
                  <strong>R$ {property.price}/noite</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="operator-section">
          <div>
            <span>Para anunciantes</span>
            <h2>Cadastro profissional com pendências claras até aprovação.</h2>
            <p>
              Documento, galeria, biometria facial, categoria, valores e contato ficam organizados
              antes de o perfil entrar em análise.
            </p>
          </div>
          <div className="operator-actions">
            <Link href="/cadastro">Criar conta profissional</Link>
            <Link href="/anfitriao/imoveis/novo">Anunciar imóvel</Link>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <Footer />

      <style jsx>{`
        .home-shell {
          min-height: 100vh;
          background:
            linear-gradient(180deg, rgba(6, 14, 27, 0.96) 0%, #060e1b 42%),
            #060e1b;
          color: #f1f5f9;
        }

        .market-hero {
          position: relative;
          min-height: 92vh;
          padding: 112px 24px 56px;
          overflow: hidden;
          border-bottom: 1px solid ${GOLD_DIM};
        }

        .hero-media {
          position: absolute;
          inset: 0;
        }

        .hero-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 42% top;
          opacity: 0.72;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(6,14,27,0.98) 0%, rgba(6,14,27,0.88) 42%, rgba(6,14,27,0.45) 74%, rgba(6,14,27,0.82) 100%),
            linear-gradient(180deg, rgba(6,14,27,0.25) 0%, #060e1b 100%);
        }

        .hero-grid {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) 420px;
          gap: 34px;
          align-items: end;
        }

        .hero-copy {
          max-width: 760px;
        }

        .eyebrow,
        .section-head span,
        .verification-copy span,
        .operator-section span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.4px;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3 {
          font-family: ${PLAYFAIR};
          letter-spacing: 0;
        }

        .hero-copy h1 {
          max-width: 780px;
          margin: 18px 0 18px;
          font-size: clamp(42px, 6.2vw, 86px);
          line-height: 0.94;
          font-weight: 700;
        }

        .hero-copy p {
          max-width: 610px;
          margin: 0 0 26px;
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.75;
        }

        .search-console {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 180px 132px;
          gap: 10px;
          max-width: 760px;
          padding: 10px;
          background: rgba(11, 20, 32, 0.86);
          border: 1px solid ${GOLD_MID};
          border-radius: 14px;
          backdrop-filter: blur(16px);
          box-shadow: 0 24px 80px rgba(0,0,0,0.34);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px 12px;
          background: #08111f;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
        }

        .field span {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .field input,
        .field select {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1f5f9;
          font-size: 14px;
        }

        .field select option {
          background: #08111f;
        }

        .search-console button {
          border: 0;
          border-radius: 10px;
          background: ${GOLD};
          color: #060e1b;
          font-size: 14px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .trust-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .trust-strip span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 999px;
          background: rgba(6,14,27,0.58);
          color: #cbd5e1;
          font-size: 12px;
        }

        .live-board {
          padding: 16px;
          background: rgba(6, 14, 27, 0.76);
          border: 1px solid ${GOLD_MID};
          border-radius: 16px;
          backdrop-filter: blur(16px);
          box-shadow: 0 24px 70px rgba(0,0,0,0.42);
        }

        .board-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .board-head span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .board-head strong {
          color: #f1f5f9;
          font-size: 16px;
          font-family: ${PLAYFAIR};
        }

        .board-head a,
        .section-head a {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: ${GOLD};
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .stacked-profiles {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compact-profile {
          display: grid;
          grid-template-columns: 74px 1fr;
          gap: 12px;
          padding: 10px;
          background: rgba(11,20,32,0.86);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
          transition: transform 0.18s, border-color 0.18s;
        }

        .compact-profile:hover {
          transform: translateY(-2px);
          border-color: ${GOLD_MID};
        }

        .compact-profile img {
          width: 74px;
          height: 92px;
          border-radius: 9px;
          object-fit: cover;
          object-position: top;
        }

        .profile-name {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }

        .profile-name strong {
          font-family: ${PLAYFAIR};
          font-size: 17px;
        }

        .profile-name span,
        .online-pill {
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(34,197,94,0.12);
          color: #22c55e;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .compact-profile p {
          margin: 0 0 10px;
          color: #64748b;
          font-size: 12px;
        }

        .profile-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: ${GOLD};
          font-size: 12px;
          font-weight: 800;
        }

        .profile-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .quick-categories,
        .production-section,
        .property-section,
        .verification-band,
        .operator-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 70px 24px;
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .section-head h2,
        .verification-copy h2,
        .operator-section h2 {
          margin: 8px 0 0;
          color: #f1f5f9;
          font-size: clamp(27px, 3.5vw, 46px);
          line-height: 1.05;
          font-weight: 700;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid ${GOLD_DIM};
          border-radius: 16px;
          overflow: hidden;
          background: #08111f;
        }

        .category-tile {
          position: relative;
          min-height: 132px;
          padding: 22px;
          color: inherit;
          text-decoration: none;
          border-right: 1px solid ${GOLD_DIM};
          background: #0b1420;
          transition: background 0.18s;
        }

        .category-tile:hover {
          background: rgba(212,168,67,0.08);
        }

        .category-tile span {
          display: block;
          color: #f1f5f9;
          font-family: ${PLAYFAIR};
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .category-tile p {
          max-width: 190px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .category-tile svg {
          position: absolute;
          right: 18px;
          bottom: 18px;
          color: ${GOLD};
        }

        .profile-grid,
        .property-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .feature-card,
        .property-card {
          display: block;
          overflow: hidden;
          border: 1px solid ${GOLD_DIM};
          border-radius: 16px;
          background: #0b1420;
          color: inherit;
          text-decoration: none;
          transition: transform 0.2s, border-color 0.2s;
        }

        .feature-card:hover,
        .property-card:hover {
          transform: translateY(-4px);
          border-color: ${GOLD_MID};
        }

        .photo-wrap {
          position: relative;
          height: 410px;
          background: #08111f;
        }

        .photo-wrap img,
        .property-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }

        .photo-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(6,14,27,0.96), rgba(6,14,27,0.18) 54%, transparent);
        }

        .verified-pill,
        .online-pill {
          position: absolute;
          top: 12px;
          left: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(6,14,27,0.78);
          border: 1px solid ${GOLD_MID};
          color: ${GOLD};
          font-size: 11px;
          font-weight: 900;
        }

        .online-pill {
          left: auto;
          right: 12px;
          border-color: rgba(34,197,94,0.3);
          color: #22c55e;
        }

        .feature-info {
          padding: 16px;
        }

        .feature-info h3,
        .property-info h3 {
          margin: 0 0 4px;
          font-size: 22px;
        }

        .feature-info p {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .price-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 16px 0 12px;
        }

        .price-line span {
          color: ${GOLD};
          font-size: 18px;
          font-weight: 900;
          font-family: ${PLAYFAIR};
        }

        .price-line small {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #f59e0b;
          font-size: 12px;
          font-weight: 800;
        }

        .tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag-row span {
          padding: 4px 9px;
          border-radius: 999px;
          background: ${GOLD_DIM};
          border: 1px solid rgba(212,168,67,0.16);
          color: #cbd5e1;
          font-size: 11px;
        }

        .verification-band {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 28px;
          align-items: center;
          border-top: 1px solid ${GOLD_DIM};
          border-bottom: 1px solid ${GOLD_DIM};
        }

        .verification-copy p,
        .operator-section p {
          max-width: 540px;
          margin: 14px 0 0;
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.75;
        }

        .verification-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .verify-item {
          min-height: 190px;
          padding: 20px;
          background: #0b1420;
          border: 1px solid ${GOLD_DIM};
          border-radius: 14px;
        }

        .verify-item svg {
          color: ${GOLD};
          margin-bottom: 18px;
        }

        .verify-item strong {
          display: block;
          color: #f1f5f9;
          font-family: ${PLAYFAIR};
          font-size: 18px;
          margin-bottom: 8px;
        }

        .verify-item p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .property-card {
          position: relative;
          min-height: 360px;
        }

        .property-card img {
          position: absolute;
          inset: 0;
          object-position: center;
          opacity: 0.68;
        }

        .property-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(6,14,27,0.98), rgba(6,14,27,0.32) 58%, rgba(6,14,27,0.08));
        }

        .property-info {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          padding: 20px;
        }

        .property-info span {
          display: inline-flex;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(6,14,27,0.7);
          border: 1px solid ${GOLD_MID};
          color: ${GOLD};
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .property-info p,
        .property-info small {
          display: block;
          color: #cbd5e1;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .property-info strong {
          display: block;
          margin-top: 14px;
          color: ${GOLD};
          font-family: ${PLAYFAIR};
          font-size: 20px;
        }

        .operator-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          border-top: 1px solid ${GOLD_DIM};
        }

        .operator-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .operator-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 10px;
          border: 1px solid ${GOLD_MID};
          color: ${GOLD};
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .operator-actions a:first-child {
          background: ${GOLD};
          color: #060e1b;
          border-color: ${GOLD};
        }

        @media (max-width: 980px) {
          .market-hero {
            min-height: auto;
          }

          .hero-grid,
          .verification-band {
            grid-template-columns: 1fr;
          }

          .live-board {
            max-width: 620px;
          }

          .category-grid,
          .profile-grid,
          .property-grid,
          .verification-grid {
            grid-template-columns: 1fr 1fr;
          }

          .operator-section {
            align-items: flex-start;
            flex-direction: column;
          }

          .operator-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 680px) {
          .market-hero {
            padding: 92px 16px 34px;
          }

          .hero-copy h1 {
            font-size: clamp(37px, 12vw, 54px);
          }

          .hero-copy p {
            font-size: 14px;
          }

          .search-console {
            grid-template-columns: 1fr;
          }

          .search-console button {
            min-height: 48px;
          }

          .trust-strip span {
            width: 100%;
          }

          .quick-categories,
          .production-section,
          .property-section,
          .verification-band,
          .operator-section {
            padding: 48px 16px;
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .category-grid,
          .profile-grid,
          .property-grid,
          .verification-grid {
            grid-template-columns: 1fr;
          }

          .category-tile {
            min-height: 116px;
          }

          .photo-wrap {
            height: 430px;
          }

          .property-card {
            min-height: 330px;
          }
        }
      `}</style>
    </div>
  );
}
