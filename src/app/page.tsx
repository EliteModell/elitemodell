"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Gem, Heart, HousePlus, LockKeyhole, ShieldCheck, Star, UserRoundPlus } from "@/components/HomeIcons";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const quickActions = [
  {
    label: "Busco prazer",
    href: "/buscar?tab=acompanhantes&selecionarCidade=1",
    text: "Explore perfis verificados sem cadastro obrigatório.",
    tag: "Cliente",
    badge: "Mais acessado",
    cta: "Ver perfis agora",
    primary: true,
    icon: Heart,
  },
  {
    label: "Anunciar imóvel",
    href: ACCOUNT_ROUTES.onboardingAnfitriao,
    text: "Cadastre um espaço reservado para atendimento discreto.",
    tag: "Anfitrião",
    cta: "Cadastrar espaço",
    icon: HousePlus,
  },
  {
    label: "Alugar quarto",
    href: "/buscar?tab=imoveis",
    text: "Encontre quartos, suítes e flats para atendimento.",
    tag: "Reservar espaço",
    cta: "Buscar quartos",
    icon: LockKeyhole,
  },
  {
    label: "Sou profissional",
    href: `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`,
    text: "Anunciar meu perfil",
    tag: "Modelo / acompanhante",
    cta: "Criar meu perfil",
    featured: true,
    icon: UserRoundPlus,
  },
];

export default function HomePage() {
  return (
    <div className="home-shell">
      <Navbar />

      <main>
        <section className="market-hero">
          <div className="hero-bg" aria-hidden="true">
            <Image
              src="/hero-sofa-model.png"
              alt=""
              fill
              priority
              quality={72}
              sizes="100vw"
              className="hero-image"
            />
          </div>
          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">A plataforma premium do Brasil</div>
              <div className="hero-benefits">
                <span>
                  <ShieldCheck size={18} /> Discrição total
                </span>
                <span>
                  <Star size={18} /> Perfis verificados
                </span>
                <span>
                  <Gem size={18} /> Experiência premium
                </span>
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
                <Link
                  key={item.label}
                  href={item.href}
                  className={`action-tile${item.featured ? " professional-tile" : ""}${item.primary ? " client-tile" : ""}`}
                >
                  <span className="action-tag">{item.tag}</span>
                  {item.badge ? <span className="action-badge">{item.badge}</span> : null}
                  <span className="action-icon">
                    <Icon size={22} />
                  </span>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                  <span className="action-cta">
                    {item.cta} <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

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
        }

        .hero-image {
          object-fit: cover;
          object-position: center 42%;
        }

        .hero-bg::before,
        .hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .hero-bg::before {
          background: linear-gradient(90deg, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.74) 42%, rgba(5,5,5,0.18) 72%, rgba(5,5,5,0.04) 100%);
        }

        .hero-bg::after {
          background: linear-gradient(180deg, rgba(5,5,5,0.08) 0%, rgba(5,5,5,0.18) 62%, #050505 100%);
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
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .section-head h2,
        .action-tile strong {
          font-family: ${PLAYFAIR};
          letter-spacing: 0;
        }

        .hero-benefits {
          display: grid;
          gap: 12px;
          margin: 24px 0;
          max-width: 360px;
        }

        .hero-benefits span {
          display: flex;
          align-items: center;
          gap: 11px;
          width: fit-content;
          min-height: 44px;
          padding: 8px 13px 8px 9px;
          border: 1px solid rgba(212,168,67,0.22);
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(5,5,5,0.78), rgba(212,168,67,0.08));
          color: #f4f1ea;
          font-size: 14px;
          font-weight: 750;
          line-height: 1.35;
          box-shadow: 0 14px 36px rgba(0,0,0,0.2);
        }

        .hero-benefits svg {
          color: ${GOLD};
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          padding: 6px;
          border: 1px solid rgba(212,168,67,0.2);
          border-radius: 50%;
          background: rgba(212,168,67,0.08);
        }

        .section-block {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 70px 24px 88px;
          background: #050505;
        }

        .quick-actions {
          position: relative;
          z-index: 3;
          background: #050505;
          isolation: isolate;
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
        }

        .section-head h2 {
          margin: 8px 0 0;
          color: #f4f1ea;
          font-size: 46px;
          line-height: 1.08;
          font-weight: 700;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          overflow: visible;
        }

        .action-tile {
          position: relative;
          min-height: 234px;
          padding: 22px;
          color: inherit;
          text-decoration: none;
          border: 1px solid ${GOLD_DIM};
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015)), #101010;
          box-shadow: 0 16px 42px rgba(0,0,0,0.22);
          overflow: hidden;
          animation: actionEnter 0.58s ease both;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .action-tile:nth-child(1) {
          animation-delay: 0.02s;
        }

        .action-tile:nth-child(2) {
          animation-delay: 0.12s;
        }

        .action-tile:nth-child(3) {
          animation-delay: 0.22s;
        }

        .action-tile:nth-child(4) {
          animation-delay: 0.32s;
        }

        .action-tile::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(135deg, rgba(212,168,67,0.12), transparent 46%);
          transition: opacity 0.2s ease;
        }

        .action-tile:hover,
        .action-tile:focus-visible,
        .action-tile:active {
          transform: translateY(-5px);
          border-color: rgba(212,168,67,0.5);
          background: linear-gradient(180deg, rgba(212,168,67,0.085), rgba(255,255,255,0.02)), #111;
          box-shadow: 0 22px 56px rgba(0,0,0,0.3), 0 0 0 1px rgba(212,168,67,0.12), 0 0 34px rgba(212,168,67,0.09);
        }

        .action-tile:hover::before,
        .action-tile:focus-visible::before,
        .action-tile:active::before {
          opacity: 1;
        }

        .action-tile:hover .action-icon,
        .action-tile:focus-visible .action-icon,
        .action-tile:active .action-icon {
          transform: translateY(-2px) scale(1.04);
          border-color: rgba(212,168,67,0.42);
          box-shadow: 0 12px 26px rgba(212,168,67,0.12);
        }

        .action-tag {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          margin-bottom: 16px;
          padding: 4px 9px;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 999px;
          background: rgba(212,168,67,0.07);
          color: #f5d78c;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .action-badge {
          position: absolute;
          z-index: 2;
          top: 18px;
          right: 18px;
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          padding: 4px 9px;
          border: 1px solid rgba(255,70,86,0.28);
          border-radius: 999px;
          background: rgba(120,16,26,0.24);
          color: #ffb3ba;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0;
          text-transform: uppercase;
          box-shadow: 0 0 22px rgba(255,70,86,0.12);
        }

        .action-icon {
          position: relative;
          z-index: 1;
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
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .action-tile strong {
          position: relative;
          z-index: 1;
          display: block;
          color: #f4f1ea;
          font-size: 22px;
          margin-bottom: 8px;
        }

        .action-tile p {
          position: relative;
          z-index: 1;
          max-width: 190px;
          color: #9f978b;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .action-cta {
          position: absolute;
          z-index: 1;
          right: 18px;
          bottom: 18px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: ${GOLD};
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .client-tile {
          border-color: rgba(245,215,140,0.36);
          background:
            radial-gradient(circle at 22% 24%, rgba(255,58,78,0.15), transparent 28%),
            linear-gradient(135deg, rgba(212,168,67,0.1), rgba(17,17,17,0.98));
          box-shadow: 0 20px 60px rgba(0,0,0,0.32), 0 0 46px rgba(212,168,67,0.08);
        }

        .client-tile .action-icon {
          border-color: rgba(255,70,86,0.4);
          background: rgba(255,70,86,0.11);
          color: #ff4054;
          box-shadow: 0 0 22px rgba(255,70,86,0.18);
        }

        .client-tile .action-icon svg {
          animation: heartBeat 1.65s ease-in-out infinite;
          fill: rgba(255,64,84,0.14);
        }

        .client-tile .action-cta {
          color: #160507;
          background: linear-gradient(135deg, #ff7080, #d4a843 58%, #f5d78c);
          border-radius: 999px;
          padding: 9px 12px;
          box-shadow: 0 12px 28px rgba(212,168,67,0.16), 0 0 28px rgba(255,70,86,0.12);
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
          letter-spacing: 0;
          box-shadow: 0 10px 28px rgba(212,168,67,0.14);
        }

        @keyframes actionEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          18% {
            transform: scale(1.16);
          }
          32% {
            transform: scale(1);
          }
          48% {
            transform: scale(1.1);
          }
          64% {
            transform: scale(1);
          }
        }

        @media (max-width: 980px) {
          .market-hero {
            min-height: auto;
          }

          .action-grid {
            grid-template-columns: 1fr 1fr;
          }

          .section-head h2 {
            font-size: 40px;
          }
        }

        @media (max-width: 680px) {
          .market-hero {
            min-height: 500px;
            padding: 32px 16px 10px;
            overflow: hidden;
          }

          .hero-bg {
            background-color: #050505;
          }

          .hero-image {
            object-position: center top;
          }

          .hero-bg::before {
            background: linear-gradient(90deg, rgba(5,5,5,0.94) 0%, rgba(5,5,5,0.72) 31%, rgba(5,5,5,0.28) 60%, rgba(5,5,5,0.04) 100%);
          }

          .hero-bg::after {
            background: linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.06) 52%, rgba(5,5,5,0.78) 100%);
          }

          .hero-content {
            min-height: auto;
            align-items: flex-start;
            padding-top: 74px;
          }

          .hero-copy {
            max-width: none;
            padding-top: 0;
          }

          .eyebrow {
            max-width: 52%;
            font-size: 10.5px;
            line-height: 1.35;
            letter-spacing: 0;
          }

          .hero-benefits {
            gap: 9px;
            max-width: 54%;
            margin: 16px 0 0;
          }

          .hero-benefits span {
            gap: 10px;
            font-size: 13.2px;
          }

          .market-hero + .section-block {
            position: relative;
            z-index: 2;
            background: #050505;
          }

          .home-shell nav {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .action-tile {
            backface-visibility: hidden;
            filter: none !important;
          }

          .section-block {
            padding: 42px 14px 56px;
          }

          .quick-actions.section-block {
            isolation: isolate;
            padding-top: 30px;
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .quick-actions .section-head {
            margin-bottom: 18px;
          }

          .quick-actions .section-head h2 {
            font-size: 36px;
          }

          .action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            border: 0;
            border-radius: 0;
            overflow: visible;
            background: #050505;
          }

          .action-tile {
            min-height: 218px;
            display: flex;
            flex-direction: column;
            padding: 14px;
            border: 1px solid ${GOLD_DIM};
            border-radius: 14px;
            background: #111;
          }

          .action-tile:hover,
          .action-tile:focus-visible,
          .action-tile:active {
            transform: translateY(-3px);
          }

          .action-icon {
            width: 42px;
            height: 42px;
            margin-bottom: 13px;
            border-radius: 12px;
          }

          .action-tag {
            min-height: 22px;
            margin-bottom: 12px;
            padding: 3px 7px;
            font-size: 8.7px;
          }

          .action-badge {
            top: 13px;
            right: 13px;
            min-height: 22px;
            padding: 3px 7px;
            font-size: 8.5px;
          }

          .action-tile strong {
            min-height: 42px;
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
            padding-top: 10px;
            justify-content: space-between;
            font-size: 10.5px;
            letter-spacing: 0;
          }

          .client-tile .action-cta {
            justify-content: center;
            padding: 8px 9px;
            text-align: center;
          }

          .professional-tile .action-cta {
            justify-content: center;
            padding: 8px 10px;
            font-size: 9.8px;
            letter-spacing: 0;
          }
        }

        @media (max-width: 380px) {
          .market-hero {
            min-height: 480px;
          }

          .eyebrow,
          .hero-benefits {
            max-width: 57%;
          }

          .hero-benefits span {
            font-size: 12.5px;
          }

          .quick-actions .section-head h2 {
            font-size: 33px;
          }

          .action-grid {
            gap: 10px;
          }

          .action-tile {
            min-height: 182px;
            padding: 14px;
          }

          .action-tile strong {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
