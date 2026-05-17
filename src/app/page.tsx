"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Heart, LockKeyhole, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const GOLD = "#d4a843";
const GOLD_SOFT = "rgba(212,168,67,0.16)";
const GOLD_LINE = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const entryCards = [
  {
    label: "Buscar prazer",
    title: "Encontre acompanhantes premium",
    text: "Acesse perfis selecionados em uma area discreta, publica e sem cadastro obrigatorio.",
    href: "/buscar?tab=acompanhantes",
    icon: Heart,
  },
  {
    label: "Buscar ambiente",
    title: "Encontre locais e espacos discretos",
    text: "Explore ambientes reservados para encontros e atendimentos com privacidade.",
    href: "/buscar?tab=imoveis",
    icon: Building2,
  },
];

export default function HomePage() {
  return (
    <div className="home-shell">
      <Navbar />

      <main className="home-entry">
        <div className="hero-bg" aria-hidden="true" />
        <div className="grain-layer" aria-hidden="true" />

        <section className="entry-content" aria-labelledby="home-title">
          <div className="brand-lockup">
            <span className="brand-monogram">EM</span>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-name">Elite Modell</span>
          </div>

          <div className="hero-copy">
            <span className="eyebrow">
              <ShieldCheck size={16} />
              Plataforma premium e discreta
            </span>
            <h1 id="home-title">Escolha primeiro o universo que deseja acessar.</h1>
            <p>
              Uma entrada reservada para prazer, ambientes privados e experiencias com
              presenca sofisticada.
            </p>
          </div>

          <div className="entry-grid" aria-label="Escolha de acesso">
            {entryCards.map(({ icon: Icon, label, title, text, href }) => (
              <Link key={label} href={href} className="entry-card">
                <span className="entry-icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <span className="entry-label">{label}</span>
                <strong>{title}</strong>
                <span className="entry-text">{text}</span>
                <span className="entry-action">
                  Acessar
                  <ArrowRight size={17} />
                </span>
              </Link>
            ))}
          </div>

          <div className="privacy-line">
            <LockKeyhole size={15} />
            Navegacao publica para explorar. Login apenas para acoes privadas.
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

        .home-entry {
          position: relative;
          min-height: calc(100svh - 64px);
          padding: 64px 24px 44px;
          display: flex;
          align-items: center;
          overflow: hidden;
          isolation: isolate;
          background: #050505;
          border-bottom: 1px solid ${GOLD_SOFT};
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: #050505;
          background-image:
            linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.82) 44%, rgba(5,5,5,0.44) 72%, rgba(5,5,5,0.18) 100%),
            linear-gradient(180deg, rgba(5,5,5,0.1) 0%, rgba(5,5,5,0.42) 58%, #050505 100%),
            url("/hero-sofa-model.png");
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center 38%;
          transform: scale(1.02);
        }

        .grain-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          opacity: 0.3;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.62) 52%, transparent 100%);
        }

        .entry-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding-top: 44px;
          animation: fadeIn 0.72s ease both;
        }

        .brand-lockup {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 40px;
          color: ${GOLD};
        }

        .brand-monogram {
          font-family: ${PLAYFAIR};
          font-size: 40px;
          line-height: 1;
          color: ${GOLD};
        }

        .brand-divider {
          width: 1px;
          height: 42px;
          background: linear-gradient(180deg, transparent, ${GOLD}, transparent);
        }

        .brand-name {
          font-family: ${PLAYFAIR};
          font-size: 26px;
          line-height: 1;
          color: #f5d78c;
        }

        .hero-copy {
          max-width: 760px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          color: #d9c58f;
          font-size: 13px;
          font-weight: 800;
        }

        .eyebrow svg {
          color: ${GOLD};
        }

        .hero-copy h1 {
          margin: 0;
          max-width: 720px;
          color: #f7f3eb;
          font-family: ${PLAYFAIR};
          font-size: 58px;
          line-height: 1.02;
          font-weight: 700;
        }

        .hero-copy p {
          max-width: 610px;
          margin: 22px 0 0;
          color: #b8b1a6;
          font-size: 17px;
          line-height: 1.72;
        }

        .entry-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          max-width: 890px;
          margin-top: 48px;
        }

        .entry-card {
          position: relative;
          min-height: 260px;
          padding: 26px;
          display: flex;
          flex-direction: column;
          color: inherit;
          text-decoration: none;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.048), rgba(255,255,255,0.014)),
            rgba(10,10,10,0.86);
          border: 1px solid ${GOLD_SOFT};
          border-radius: 8px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.38);
          backdrop-filter: blur(18px);
          transition:
            transform 0.24s ease,
            border-color 0.24s ease,
            background 0.24s ease,
            box-shadow 0.24s ease;
        }

        .entry-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(120deg, rgba(245,215,140,0.16), transparent 42%);
          opacity: 0;
          transition: opacity 0.24s ease;
        }

        .entry-card:hover {
          transform: translateY(-5px);
          border-color: ${GOLD_LINE};
          background:
            linear-gradient(145deg, rgba(212,168,67,0.08), rgba(255,255,255,0.02)),
            rgba(12,12,12,0.94);
          box-shadow: 0 32px 92px rgba(0,0,0,0.48);
        }

        .entry-card:hover::before {
          opacity: 1;
        }

        .entry-icon {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: ${GOLD};
          border: 1px solid ${GOLD_SOFT};
          border-radius: 8px;
          background: rgba(212,168,67,0.08);
        }

        .entry-label {
          color: ${GOLD};
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .entry-card strong {
          display: block;
          margin-top: 10px;
          color: #f7f3eb;
          font-family: ${PLAYFAIR};
          font-size: 27px;
          line-height: 1.14;
        }

        .entry-text {
          display: block;
          max-width: 320px;
          margin-top: 12px;
          color: #aaa296;
          font-size: 14px;
          line-height: 1.62;
        }

        .entry-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          padding-top: 24px;
          color: #f5d78c;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .entry-action svg {
          transition: transform 0.24s ease;
        }

        .entry-card:hover .entry-action svg {
          transform: translateX(4px);
        }

        .privacy-line {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 24px;
          color: #8d8578;
          font-size: 13px;
        }

        .privacy-line svg {
          color: ${GOLD};
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 820px) {
          .home-entry {
            min-height: auto;
            padding: 94px 18px 38px;
            align-items: flex-start;
          }

          .hero-bg {
            background-image:
              linear-gradient(180deg, rgba(5,5,5,0.42) 0%, rgba(5,5,5,0.66) 42%, #050505 88%),
              url("/hero-sofa-model.png");
            background-size: auto 560px;
            background-position: 63% top;
            opacity: 0.78;
          }

          .grain-layer {
            display: none;
          }

          .entry-content {
            padding-top: 0;
          }

          .brand-lockup {
            gap: 12px;
            margin-bottom: 92px;
          }

          .brand-monogram {
            font-size: 34px;
          }

          .brand-divider {
            height: 36px;
          }

          .brand-name {
            font-size: 22px;
          }

          .hero-copy h1 {
            font-size: 40px;
            line-height: 1.05;
          }

          .hero-copy p {
            margin-top: 16px;
            font-size: 15px;
            line-height: 1.62;
          }

          .entry-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 30px;
          }

          .entry-card {
            min-height: 212px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: none;
            backdrop-filter: none;
          }

          .entry-card:hover {
            transform: none;
          }

          .entry-icon {
            width: 46px;
            height: 46px;
            margin-bottom: 18px;
          }

          .entry-card strong {
            font-size: 24px;
          }

          .privacy-line {
            align-items: flex-start;
            margin-top: 18px;
            font-size: 12px;
            line-height: 1.5;
          }
        }

        @media (max-width: 420px) {
          .home-entry {
            padding-left: 16px;
            padding-right: 16px;
          }

          .brand-lockup {
            margin-bottom: 76px;
          }

          .hero-copy h1 {
            font-size: 36px;
          }

          .entry-card {
            min-height: 202px;
            padding: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .entry-content,
          .entry-card,
          .entry-card::before,
          .entry-action svg {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
