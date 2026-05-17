"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Gem,
  Heart,
  HousePlus,
  LockKeyhole,
  ShieldCheck,
  Star,
  UserRoundPlus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

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
    href: "/buscar?tab=imoveis",
    text: "Encontre quartos, suites e flats para atendimento.",
    icon: LockKeyhole,
  },
  {
    label: "Sou profissional",
    href: "/cadastro?tipo=profissional",
    text: "Anunciar meu perfil",
    cta: "Começar cadastro",
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
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">A plataforma premium do Brasil</div>
              <div className="hero-benefits">
                <span>
                  <ShieldCheck size={18} /> Discrição total e segurança
                </span>
                <span>
                  <Star size={18} /> Acompanhantes verificadas
                </span>
                <span>
                  <Gem size={18} /> Experiências premium
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
                  className={item.featured ? "action-tile professional-tile" : "action-tile"}
                >
                  <span className="action-icon">
                    <Icon size={22} />
                  </span>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                  <span className="action-cta">
                    {item.cta ?? "Acessar"} <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
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
          transition: background 0.18s, border-color 0.18s, transform 0.18s;
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
          letter-spacing: 0;
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
          letter-spacing: 0;
          box-shadow: 0 10px 28px rgba(212,168,67,0.14);
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
            background-image:
              linear-gradient(90deg, rgba(5,5,5,0.94) 0%, rgba(5,5,5,0.72) 31%, rgba(5,5,5,0.28) 60%, rgba(5,5,5,0.04) 100%),
              linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.06) 52%, rgba(5,5,5,0.78) 100%),
              url("/hero-sofa-model.png");
            background-position: center top;
            background-size: cover;
            background-repeat: no-repeat;
            background-color: #050505;
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

          .home-shell nav,
          .bottom-nav {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .action-tile {
            transform: none !important;
            backface-visibility: hidden;
            box-shadow: none !important;
            filter: none !important;
          }

          .section-block {
            padding: 42px 14px 92px;
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
            min-height: 186px;
            display: flex;
            flex-direction: column;
            padding: 16px;
            border: 1px solid ${GOLD_DIM};
            border-radius: 14px;
            background: #111;
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
            padding-top: 12px;
            justify-content: space-between;
            font-size: 10.5px;
            letter-spacing: 0;
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
