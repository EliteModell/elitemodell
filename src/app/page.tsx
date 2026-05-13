"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Camera,
  ChevronRight,
  Gem,
  Heart,
  HousePlus,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  UserRoundCheck,
  UserRoundPlus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { mockProfiles } from "@/lib/mockProfiles";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const cities = ["Belo Horizonte", "Nova Lima", "Lagoa Santa", "Contagem", "São Paulo", "Rio de Janeiro"];

const properties = [
  {
    id: 1,
    title: "Apartamento Lourdes",
    city: "Belo Horizonte, MG",
    price: 890,
    image: "/property-bh-luxury.png",
    type: "Apartamento",
    details: "ambiente reservado · garagem · portaria 24h",
  },
  {
    id: 2,
    title: "Casa Reservada",
    city: "Itaúna, MG",
    price: 650,
    image: "/property-itauna-country.png",
    type: "Casa",
    details: "piscina · privacidade · acesso discreto",
  },
  {
    id: 3,
    title: "Loft Privativo",
    city: "Itaúna, MG",
    price: 420,
    image: "/property-itauna-loft.png",
    type: "Loft",
    details: "suíte · entrada discreta · Wi-Fi",
  },
];

const verificationItems = [
  { icon: ShieldCheck, title: "Documento protegido", text: "Conferência interna e privada antes da publicação." },
  { icon: Camera, title: "Galeria real", text: "Fotos revisadas para manter perfis autênticos e atuais." },
  { icon: UserRoundCheck, title: "Acompanhante verificada", text: "Análise manual para liberar apenas perfis aprovados." },
];

const quickActions = [
  {
    label: "Busco prazer",
    href: "/buscar?tab=acompanhantes&q=Belo%20Horizonte",
    text: "Encontre companhia para momentos especiais e discretos.",
    icon: Heart,
  },
  {
    label: "Anunciar imóvel",
    href: "/anfitriao/imoveis/novo",
    text: "Cadastre um espaço reservado e alcance clientes qualificados.",
    icon: HousePlus,
  },
  {
    label: "Alugar imóvel",
    href: "/buscar?tab=imoveis&q=Belo%20Horizonte",
    text: "Encontre casas, flats e apartamentos discretos para sua estadia.",
    icon: LockKeyhole,
  },
  {
    label: "Sou profissional",
    href: "/cadastro",
    text: "Cadastre seu perfil com documentos, fotos reais e biometria.",
    icon: UserRoundPlus,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [city, setCity] = useState("Belo Horizonte");
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
      <Navbar />

      <main>
        <section className="market-hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">
                A plataforma premium do Brasil
              </div>
              <h1 className="premium-title">
                <span>Acompanhantes</span>
                <span>de luxo.</span>
                <span>Experiências inesquecíveis.</span>
              </h1>
              <div className="hero-signature">Discrição. Elegância. Sofisticação.</div>
              <div className="hero-benefits">
                <span><ShieldCheck size={18} /> Discrição total e segurança</span>
                <span><Star size={18} /> Acompanhantes verificadas</span>
                <span><Gem size={18} /> Experiências premium</span>
              </div>
              <Link className="hero-cta" href="/buscar?tab=acompanhantes&q=Belo%20Horizonte">
                Encontre sua companhia ideal <ChevronRight size={22} />
              </Link>

              <form className="search-console" onSubmit={submitSearch}>
                <label className="field field-large">
                  <span>Cidade</span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Belo Horizonte, Nova Lima, Lagoa Santa..."
                    list="home-cities"
                  />
                  <datalist id="home-cities">
                    {cities.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <div className="field category-field" role="group" aria-label="Categoria">
                  <span>Categoria</span>
                  <div className="category-options">
                    {[
                      ["mulheres", "Mulheres"],
                      ["trans", "Trans"],
                      ["homens", "Homens"],
                      ["imoveis", "Imóveis"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={category === value ? "active" : ""}
                        onClick={() => setCategory(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="search-submit">
                  <Search size={18} />
                  Buscar
                </button>
              </form>

              <div className="trust-strip">
                <span><ShieldCheck size={16} /> Perfis verificados</span>
                <span><Camera size={16} /> Fotos reais</span>
                <span><BadgeCheck size={16} /> Dados privados</span>
              </div>
            </div>
          </div>
        </section>

        <section className="quick-actions section-block">
          <div className="section-head">
            <div>
              <span>Entrada rápida</span>
              <h2>O que você procura?</h2>
            </div>
          </div>
          <div className="action-grid">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
              <Link key={item.label} href={item.href} className="action-tile">
                <span className="action-icon"><Icon size={22} /></span>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
                <span className="action-cta">Acessar <ChevronRight size={16} /></span>
              </Link>
              );
            })}
          </div>
        </section>

        <section className="section-block">
          <div className="section-head">
            <div>
              <span>Seleção real</span>
              <h2>Perfis verificados com presença real</h2>
            </div>
            <Link href="/buscar?tab=acompanhantes">Ver acompanhantes <ChevronRight size={16} /></Link>
          </div>

          <div className="profile-grid">
            {featuredProfiles.map((profile) => (
              <Link key={profile.id} href={`/profissionais/${profile.slug}`} className="feature-card">
                <div className="feature-photo">
                  <img src={profile.image} alt="" />
                  <div className="feature-photo-shade" />
                  <div className="verified-pill">
                    <UserRoundCheck size={13} />
                    Verificada
                  </div>
                  {profile.online && <div className="online-pill">Online agora</div>}
                </div>
                <div className="feature-info">
                  <h3>{profile.displayName}</h3>
                  <p><MapPin size={13} /> {profile.city}, {profile.state}</p>
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

        <section className="verification-band section-block">
          <div className="verification-copy">
            <span>Verificação Elite Modell</span>
            <h2>Documentos e fotos analisados antes do perfil entrar no ar.</h2>
            <p>
              Cada cadastro passa por revisão privada, galeria real e checagem de consistência.
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

        <section className="section-block">
          <div className="section-head">
            <div>
              <span>Locais selecionados</span>
              <h2>Imóveis discretos para esse tipo de serviço</h2>
            </div>
            <Link href="/buscar?tab=imoveis">Ver imóveis <ChevronRight size={16} /></Link>
          </div>

          <div className="property-grid">
            {properties.map((property) => (
              <Link key={property.id} href={`/imoveis/${property.id}`} className="property-card">
                <div className="property-photo">
                  <img src={property.image} alt="" />
                  <div className="property-photo-shade" />
                  <span>{property.type}</span>
                </div>
                <div className="property-info">
                  <h3>{property.title}</h3>
                  <p>{property.city}</p>
                  <small>{property.details}</small>
                  <strong><Building2 size={16} /> R$ {property.price}/noite</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="operator-section section-block">
          <div>
            <span>Para anunciantes</span>
            <h2>Cadastro profissional com pendências claras até aprovação.</h2>
            <p>
              Documento, galeria, categoria, valores e contato ficam organizados
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

      <style>{`
        .home-shell {
          min-height: 100vh;
          background: #060e1b;
          color: #f1f5f9;
        }

        .market-hero {
          position: relative;
          min-height: calc(100vh - 64px);
          padding: 112px 24px 64px;
          overflow: hidden;
          border-bottom: 1px solid ${GOLD_DIM};
          isolation: isolate;
          background: #060e1b;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-color: #060e1b;
          background-image:
            linear-gradient(90deg, rgba(2,7,14,0.92) 0%, rgba(2,7,14,0.78) 42%, rgba(2,7,14,0.18) 72%, rgba(2,7,14,0.04) 100%),
            linear-gradient(180deg, rgba(2,7,14,0.1) 0%, rgba(2,7,14,0.22) 62%, #060e1b 100%),
            url("/hero-sofa-model.png");
          background-size: cover;
          background-position: center 42%;
          background-repeat: no-repeat;
        }

        .hero-content {
          max-width: 1280px;
          margin: 0 auto;
          min-height: calc(100vh - 190px);
          display: flex;
          align-items: center;
        }

        .hero-copy {
          max-width: 610px;
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

        .hero-copy h1,
        .section-head h2,
        .verification-copy h2,
        .operator-section h2,
        .feature-info h3,
        .property-info h3 {
          font-family: ${PLAYFAIR};
          letter-spacing: 0;
        }

        .hero-copy h1 {
          max-width: 790px;
          margin: 18px 0;
          font-size: clamp(42px, 6vw, 82px);
          line-height: 0.98;
          font-weight: 700;
        }

        .premium-title span {
          display: block;
          background: linear-gradient(135deg, #ffffff 0%, #e8dfc8 18%, #ffffff 36%, #d4a843 62%, #f5d78c 78%, #ffffff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 22px 55px rgba(212,168,67,0.12);
        }

        .premium-title span:nth-child(2) {
          background: linear-gradient(135deg, #ffe5a0 0%, #d4a843 26%, #f5d78c 48%, #9e7b2a 78%, #fff2bf 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-signature {
          color: #f4d98c;
          font-size: clamp(18px, 2vw, 22px);
          font-weight: 800;
          letter-spacing: 0.2px;
          margin: 0 0 24px;
        }

        .hero-benefits {
          display: grid;
          gap: 12px;
          margin: 0 0 34px;
        }

        .hero-benefits span {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #e5edf8;
          font-size: 17px;
          line-height: 1.35;
          text-shadow: 0 3px 14px rgba(0,0,0,0.45);
        }

        .hero-benefits svg {
          color: ${GOLD};
          flex: 0 0 auto;
        }

        .hero-cta {
          width: min(100%, 610px);
          min-height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border: 1.5px solid rgba(212,168,67,0.82);
          border-radius: 12px;
          background: rgba(6,14,27,0.22);
          color: #f5d78c;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 4px;
          font-size: 15px;
          font-weight: 900;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 44px rgba(0,0,0,0.32);
          backdrop-filter: blur(8px);
        }

        .hero-copy p,
        .verification-copy p,
        .operator-section p {
          max-width: 610px;
          margin: 0 0 26px;
          color: #9fb0c8;
          font-size: 16px;
          line-height: 1.75;
        }

        .search-console {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) minmax(278px, 0.82fr) 148px;
          gap: 8px;
          max-width: 790px;
          margin-top: 26px;
          padding: 8px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015)),
            rgba(6, 14, 27, 0.76);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          backdrop-filter: blur(18px);
          box-shadow:
            0 24px 80px rgba(0,0,0,0.38),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .field {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 11px 13px;
          background:
            linear-gradient(180deg, rgba(12,24,40,0.92), rgba(7,16,29,0.92));
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 20px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .field span {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1f5f9;
          font-size: 14px;
        }

        .category-field {
          justify-content: center;
        }

        .category-options {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 4px;
        }

        .category-options button {
          min-width: 0;
          min-height: 30px;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.035);
          color: #9fb0c8;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        .category-options button.active {
          background: linear-gradient(135deg, rgba(255,224,139,0.32), rgba(212,168,67,0.18));
          color: #fff0bf;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 20px rgba(0,0,0,0.2);
        }

        .search-submit {
          min-height: 62px;
          border: 0;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffe08b 0%, #d4a843 52%, #ad8129 100%);
          color: #060e1b;
          font-size: 15px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(212,168,67,0.22), inset 0 1px 0 rgba(255,255,255,0.32);
        }

        .trust-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          max-width: 790px;
          margin-top: 16px;
        }

        .trust-strip span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 42px;
          padding: 8px 10px;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 12px;
          background: rgba(6,14,27,0.54);
          color: #cbd5e1;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .live-board {
          padding: 16px;
          background: rgba(6, 14, 27, 0.78);
          border: 1px solid ${GOLD_MID};
          border-radius: 16px;
          backdrop-filter: blur(16px);
          box-shadow: 0 24px 70px rgba(0,0,0,0.42);
        }

        .board-head,
        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }

        .board-head {
          align-items: flex-start;
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
          flex-shrink: 0;
        }

        .stacked-profiles {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compact-profile {
          display: grid;
          grid-template-columns: 74px minmax(0, 1fr);
          gap: 12px;
          padding: 10px;
          background: rgba(11,20,32,0.88);
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

        .compact-photo {
          position: relative;
          width: 74px;
          height: 92px;
          border-radius: 9px;
          background-color: #0b1420;
          overflow: hidden;
        }

        .compact-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          display: block;
        }

        .compact-info {
          min-width: 0;
        }

        .profile-name {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }

        .profile-name strong {
          min-width: 0;
          color: #f1f5f9;
          font-family: ${PLAYFAIR};
          font-size: 17px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          flex-shrink: 0;
        }

        .compact-profile p {
          margin: 0 0 10px;
          color: #cbd5e1;
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

        .section-block {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 70px 24px;
          background: #060e1b;
        }

        .quick-actions {
          position: relative;
          z-index: 3;
          background: #060e1b;
          isolation: isolate;
        }

        .section-head {
          margin-bottom: 24px;
        }

        .section-head h2,
        .verification-copy h2,
        .operator-section h2 {
          margin: 8px 0 0;
          color: #f1f5f9;
          font-size: clamp(27px, 3.5vw, 46px);
          line-height: 1.08;
          font-weight: 700;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid ${GOLD_DIM};
          border-radius: 16px;
          overflow: hidden;
          background: #08111f;
        }

        .action-tile {
          position: relative;
          min-height: 178px;
          padding: 22px;
          color: inherit;
          text-decoration: none;
          border-right: 1px solid ${GOLD_DIM};
          background: #0b1420;
          transition: background 0.18s;
        }

        .action-tile:last-child {
          border-right: 0;
        }

        .action-tile:hover {
          background: rgba(212,168,67,0.08);
        }

        .action-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          margin-bottom: 18px;
          border: 1px solid ${GOLD_MID};
          border-radius: 14px;
          background: rgba(212,168,67,0.1);
          color: ${GOLD};
        }

        .action-tile strong {
          display: block;
          color: #f1f5f9;
          font-family: ${PLAYFAIR};
          font-size: 22px;
          margin-bottom: 8px;
        }

        .action-tile p {
          max-width: 190px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .action-cta {
          position: absolute;
          right: 18px;
          bottom: 18px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: ${GOLD};
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .profile-grid,
        .property-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .feature-card,
        .property-card {
          display: flex;
          flex-direction: column;
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

        .feature-photo,
        .property-photo {
          position: relative;
          min-height: 420px;
          background-color: #08111f;
          overflow: hidden;
        }

        .feature-photo img,
        .property-photo img {
          width: 100%;
          height: 100%;
          min-height: inherit;
          object-fit: cover;
          object-position: top;
          display: block;
        }

        .feature-photo-shade,
        .property-photo-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(6,14,27,0.92), rgba(6,14,27,0.12) 58%, transparent);
          pointer-events: none;
        }

        .verified-pill,
        .online-pill,
        .property-photo span {
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

        .feature-info,
        .property-info {
          padding: 16px;
        }

        .feature-info h3,
        .property-info h3 {
          margin: 0 0 4px;
          font-size: 22px;
        }

        .feature-info p,
        .property-info p,
        .property-info small {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        .property-info small {
          display: block;
          margin-top: 6px;
        }

        .price-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 16px 0 12px;
        }

        .price-line span,
        .property-info strong {
          color: ${GOLD};
          font-size: 18px;
          font-weight: 900;
          font-family: ${PLAYFAIR};
        }

        .price-line small,
        .property-info strong {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .price-line small {
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
          margin-top: 14px;
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
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.65;
        }

        .property-photo {
          min-height: 250px;
        }

        .property-photo img {
          object-position: center;
        }

        .property-info strong {
          margin-top: 16px;
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
          flex-shrink: 0;
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

          .hero-content,
          .verification-band {
            grid-template-columns: 1fr;
          }

          .live-board {
            max-width: 640px;
          }

          .action-grid,
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
            min-height: auto;
            padding: 64px 16px 22px;
            overflow: hidden;
            contain: paint;
          }

          .hero-bg {
            background-image:
              linear-gradient(90deg, rgba(2,7,14,0.98) 0%, rgba(2,7,14,0.9) 43%, rgba(2,7,14,0.48) 72%, rgba(2,7,14,0.22) 100%),
              linear-gradient(180deg, rgba(2,7,14,0.04) 0%, rgba(2,7,14,0.18) 48%, #060e1b 93%, #060e1b 100%),
              url("/hero-sofa-model.png");
            background-position: 62% top;
            background-size: cover;
            background-repeat: no-repeat;
            background-color: #060e1b;
          }

          .hero-content {
            min-height: auto;
            align-items: flex-start;
            padding-top: 46px;
          }

          .hero-copy {
            max-width: none;
          }

          .eyebrow {
            max-width: 88%;
            font-size: 10px;
            letter-spacing: 2px;
          }

          .hero-copy h1 {
            max-width: 92%;
            margin: 12px 0 16px;
            font-size: clamp(35px, 10.7vw, 47px);
            line-height: 1.02;
          }

          .hero-signature {
            margin-bottom: 24px;
            font-size: 17px;
          }

          .hero-benefits {
            gap: 11px;
            margin-bottom: 28px;
          }

          .hero-benefits span {
            gap: 10px;
            font-size: 14.5px;
          }

          .hero-cta {
            width: 100%;
            min-height: 58px;
            padding: 0 18px;
            justify-content: space-between;
            letter-spacing: 2.4px;
            font-size: 12px;
          }

          .search-console {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 22px;
            padding: 10px;
            border: 0;
            border-radius: 24px;
            overflow: hidden;
            background:
              linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025)),
              rgba(5,12,23,0.9);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.08),
              0 14px 30px rgba(0,0,0,0.24);
          }

          .market-hero + .section-block {
            position: relative;
            z-index: 2;
            background: #060e1b;
          }

          .field {
            padding: 12px 14px;
            border: 0;
            border-radius: 20px;
            background:
              linear-gradient(180deg, rgba(10,23,39,0.96), rgba(7,16,29,0.96));
          }

          .category-options {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 6px;
          }

          .category-options button {
            min-height: 38px;
            font-size: 11px;
            background: rgba(255,255,255,0.045);
          }

          .search-submit {
            min-height: 52px;
            border-radius: 999px;
          }

          .trust-strip {
            display: none;
          }

          .section-block {
            padding: 48px 16px;
          }

          .quick-actions.section-block {
            isolation: isolate;
            padding-top: 34px;
            padding-bottom: 34px;
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .profile-grid,
          .property-grid,
          .verification-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions .section-head {
            margin-bottom: 18px;
          }

          .quick-actions .section-head h2 {
            font-size: clamp(30px, 9vw, 38px);
          }

          .action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            border: 0;
            border-radius: 0;
            overflow: hidden;
            background: #060e1b;
          }

          .action-tile {
            min-height: 154px;
            display: flex;
            flex-direction: column;
            padding: 14px;
            border: 1px solid ${GOLD_DIM};
            border-radius: 14px;
            background:
              linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01)),
              #0b1420;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
          }

          .action-tile:last-child {
            border-right: 1px solid ${GOLD_DIM};
          }

          .action-icon {
            width: 42px;
            height: 42px;
            margin-bottom: 14px;
            border-radius: 12px;
          }

          .action-tile strong {
            min-height: 44px;
            font-size: 19px;
            line-height: 1.05;
            margin-bottom: 7px;
          }

          .action-tile p {
            max-width: none;
            display: -webkit-box;
            overflow: hidden;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            font-size: 11.5px;
            line-height: 1.35;
          }

          .action-cta {
            position: static;
            margin-top: auto;
            padding-top: 12px;
            justify-content: space-between;
            font-size: 10.5px;
            letter-spacing: 1.2px;
          }

          .feature-photo {
            min-height: 430px;
          }

          .property-photo {
            min-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}
