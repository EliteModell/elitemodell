"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  ChevronRight,
  Gem,
  Heart,
  HousePlus,
  LockKeyhole,
  MapPin,
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

const properties = [
  {
    id: 1,
    title: "Suite discreta Lourdes",
    city: "Belo Horizonte, MG",
    price: 890,
    image: "/property-bh-luxury.png",
    type: "Suite premium",
    details: "ambiente reservado · garagem · portaria 24h",
  },
  {
    id: 2,
    title: "Local reservado Itauna",
    city: "Itaúna, MG",
    price: 650,
    image: "/property-itauna-country.png",
    type: "Quarto privado",
    details: "piscina · privacidade · acesso discreto",
  },
  {
    id: 3,
    title: "Flat privativo",
    city: "Itaúna, MG",
    price: 420,
    image: "/property-itauna-loft.png",
    type: "Flat discreto",
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
    href: "/buscar?tab=acompanhantes",
    text: "Explore perfis verificados sem cadastro obrigatorio.",
    icon: Heart,
  },
  {
    label: "Anunciar imóvel",
    href: "/anfitriao/imoveis/novo",
    text: "Cadastre um espaco reservado para atendimento discreto.",
    icon: HousePlus,
  },
  {
    label: "Alugar quarto",
    href: "/buscar?tab=imoveis&q=Belo%20Horizonte",
    text: "Encontre quartos, suites e flats para atendimento.",
    icon: LockKeyhole,
  },
  {
    label: "Sou profissional",
    href: "/cadastro?tipo=profissional",
    text: "Anunciar meu perfil",
    cta: "Comecar cadastro",
    featured: true,
    icon: UserRoundPlus,
  },
];

export default function HomePage() {
  const featuredProfiles = useMemo(
    () => mockProfiles.filter((profile) => profile.verified).slice(0, 3),
    []
  );

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
              <div className="hero-benefits">
                <span><ShieldCheck size={18} /> Discrição total e segurança</span>
                <span><Star size={18} /> Acompanhantes verificadas</span>
                <span><Gem size={18} /> Experiências premium</span>
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
              <Link key={item.label} href={item.href} className={item.featured ? "action-tile professional-tile" : "action-tile"}>
                <span className="action-icon"><Icon size={22} /></span>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
                <span className="action-cta">{item.cta ?? "Acessar"} <ChevronRight size={16} /></span>
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
              <h2>Quartos e suites discretas para atendimento</h2>
            </div>
            <Link href="/buscar?tab=imoveis">Ver quartos <ChevronRight size={16} /></Link>
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
                  <strong><Building2 size={16} /> R$ {property.price}/periodo</strong>
                </div>
              </Link>
            ))}
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
          background: #050505;
          color: #f4f1ea;
          overflow-x: hidden;
        }

        .market-hero {
          position: relative;
          min-height: min(760px, calc(100vh - 64px));
          padding: 104px 24px 52px;
          overflow: hidden;
          border-bottom: 1px solid ${GOLD_DIM};
          isolation: isolate;
          background: #050505;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: #050505;
          background-image:
            linear-gradient(90deg, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.74) 42%, rgba(5,5,5,0.18) 72%, rgba(5,5,5,0.04) 100%),
            linear-gradient(180deg, rgba(5,5,5,0.08) 0%, rgba(5,5,5,0.18) 62%, #050505 100%),
            url("/hero-sofa-model.png");
          background-size: cover;
          background-position: center 42%;
          background-repeat: no-repeat;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          min-height: calc(100vh - 210px);
          display: flex;
          align-items: center;
        }

        .hero-copy {
          max-width: 640px;
          padding-top: 24px;
        }

        .eyebrow,
        .section-head span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.4px;
          text-transform: uppercase;
        }

        .section-head h2,
        .feature-info h3,
        .property-info h3 {
          font-family: ${PLAYFAIR};
          letter-spacing: 0;
        }

        .hero-benefits {
          display: grid;
          gap: 10px;
          margin: 22px 0;
        }

        .hero-benefits span {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #f4f1ea;
          font-size: 17px;
          line-height: 1.35;
          text-shadow: 0 3px 14px rgba(0,0,0,0.45);
        }

        .hero-benefits svg {
          color: ${GOLD};
          flex: 0 0 auto;
        }

        .hero-copy p {
          max-width: 610px;
          margin: 0 0 26px;
          color: #b8b1a6;
          font-size: 16px;
          line-height: 1.75;
        }

        .live-board {
          padding: 16px;
          background: rgba(10, 10, 10, 0.78);
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
          color: #8d8578;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .board-head strong {
          color: #f4f1ea;
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
          background: rgba(17,17,17,0.88);
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
          background-color: #111;
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
          color: #f4f1ea;
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
          color: #cfc8ba;
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
          background: #050505;
        }

        main > .section-block:last-child {
          padding-bottom: 54px;
        }

        .quick-actions {
          position: relative;
          z-index: 3;
          background: #050505;
          isolation: isolate;
        }

        .section-head {
          margin-bottom: 24px;
        }

        .section-head h2,
        .section-head h2 {
          margin: 8px 0 0;
          color: #f4f1ea;
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
          background: #101010;
        }

        .action-tile {
          position: relative;
          min-height: 178px;
          padding: 22px;
          color: inherit;
          text-decoration: none;
          border-right: 1px solid ${GOLD_DIM};
          background: #111;
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
          color: #f4f1ea;
          font-family: ${PLAYFAIR};
          font-size: 22px;
          margin-bottom: 8px;
        }

        .action-tile p {
          max-width: 190px;
          color: #9f978b;
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

        .professional-tile {
          border-color: rgba(212,168,67,0.18);
          background: linear-gradient(135deg, rgba(212,168,67,0.07), rgba(17,17,17,0.98));
        }

        .professional-tile p {
          color: #f5d78c;
          font-weight: 850;
        }

        .professional-tile .action-cta {
          color: #080704;
          background: linear-gradient(135deg, #ffe08b, ${GOLD});
          border-radius: 999px;
          padding: 8px 11px;
          letter-spacing: 1px;
          box-shadow: 0 10px 28px rgba(212,168,67,0.14);
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
          background: #111;
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
          background-color: #111;
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
          background: linear-gradient(to top, rgba(5,5,5,0.92), rgba(5,5,5,0.12) 58%, transparent);
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
          background: rgba(5,5,5,0.78);
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
          color: #9f978b;
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
          color: #cfc8ba;
          font-size: 11px;
        }

        .verification-band {
          padding-top: 34px;
          padding-bottom: 70px;
          border-top: 1px solid rgba(212,168,67,0.12);
          border-bottom: 1px solid rgba(212,168,67,0.12);
        }

        .verification-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .verify-item {
          min-height: 174px;
          padding: 22px;
          background:
            linear-gradient(145deg, rgba(212,168,67,0.06), rgba(255,255,255,0.025)),
            #101010;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .verify-item svg {
          color: ${GOLD};
          box-sizing: content-box;
          margin-bottom: 18px;
          padding: 10px;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 12px;
          background: rgba(212,168,67,0.07);
        }

        .verify-item strong {
          display: block;
          color: #f4f1ea;
          font-family: ${PLAYFAIR};
          font-size: 18px;
          margin-bottom: 8px;
        }

        .verify-item p {
          margin: 0;
          color: #9f978b;
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

        @media (max-width: 980px) {
          .market-hero {
            min-height: auto;
          }

          .hero-content {
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

        }

        @media (max-width: 680px) {
          .market-hero {
            min-height: 430px;
            padding: 36px 18px 8px;
            overflow: hidden;
          }

          .hero-bg {
            background-image:
              linear-gradient(90deg, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.66) 34%, rgba(5,5,5,0.2) 62%, rgba(5,5,5,0.02) 100%),
              linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.05) 58%, rgba(5,5,5,0.86) 100%),
              url("/hero-sofa-model.png");
            background-position: 64% top;
            background-size: auto 590px;
            background-repeat: no-repeat;
          background-color: #050505;
          }

          .hero-content {
            min-height: auto;
            align-items: flex-start;
            padding-top: 70px;
          }

          .hero-copy {
            max-width: none;
            padding-top: 0;
          }

          .eyebrow {
            max-width: 74%;
            font-size: 10px;
            letter-spacing: 2px;
          }

          .hero-benefits {
            gap: 9px;
            max-width: 68%;
            margin: 18px 0 0;
          }

          .hero-benefits span {
            gap: 10px;
            font-size: 13.5px;
          }

          .market-hero + .section-block {
            position: relative;
            z-index: 2;
            background: #050505;
          }

          .home-shell nav,
          .bottom-nav {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .feature-card,
          .property-card,
          .action-tile,
          .feature-photo,
          .property-photo {
            transform: none !important;
            backface-visibility: hidden;
            box-shadow: none !important;
            filter: none !important;
          }

          .section-block {
            padding: 48px 16px;
          }

          main > .section-block:last-child {
            padding-bottom: 34px;
          }

          .verification-band.section-block {
            padding-top: 24px;
            padding-bottom: 42px;
          }

          .quick-actions.section-block {
            isolation: isolate;
            padding-top: 20px;
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
            overflow: visible;
            background: #050505;
          }

          .action-tile {
            min-height: 154px;
            display: flex;
            flex-direction: column;
            padding: 14px;
            border: 1px solid ${GOLD_DIM};
            border-radius: 14px;
            background: #111;
            box-shadow: none;
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

          .professional-tile p {
            display: block;
            -webkit-line-clamp: unset;
            color: #f5d78c;
            font-size: 12.5px;
            font-weight: 900;
          }

          .action-cta {
            position: static;
            margin-top: auto;
            padding-top: 12px;
            justify-content: space-between;
            font-size: 10.5px;
            letter-spacing: 1.2px;
          }

          .professional-tile .action-cta {
            justify-content: center;
            padding: 8px 10px;
            font-size: 9.8px;
            letter-spacing: 0.6px;
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
