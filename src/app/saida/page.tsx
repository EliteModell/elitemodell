import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saida segura | Elite Modell",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SafeExitPage() {
  return (
    <main className="safe-exit-page">
      <section className="safe-exit-card">
        <div className="brand" aria-label="Elite Modell">
          <span>elite</span>
          <strong>modell</strong>
        </div>
        <p className="eyebrow">Saida segura</p>
        <h1>Acesso nao confirmado</h1>
        <p>
          Voce optou por nao continuar no ambiente da Elite Modell. Esta tela nao exibe conteudo adulto e mantem sua
          navegacao em uma area neutra.
        </p>
        <Link href="https://www.google.com" className="exit-button">
          Sair da plataforma
        </Link>
      </section>

      <style>{`
        .safe-exit-page {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: max(22px, env(safe-area-inset-top)) 16px max(22px, env(safe-area-inset-bottom));
          background:
            radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%),
            radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%),
            #050505;
          color: #fff;
          overflow-x: hidden;
        }

        .safe-exit-card {
          width: min(100%, 430px);
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          padding: 28px 22px 22px;
          text-align: center;
          box-shadow: 0 34px 100px rgba(0,0,0,0.58), 0 0 50px rgba(214,168,58,0.08);
        }

        .brand {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          margin-bottom: 24px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 999px;
          background: rgba(11,11,13,0.84);
          padding: 9px 18px;
          font-size: 19px;
          font-weight: 950;
        }

        .brand span {
          background: linear-gradient(135deg, #ffe5a0 0%, #d6a83a 28%, #f5d77a 55%, #9e7b2a 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand strong {
          color: #fff;
          font: inherit;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #d6a83a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(30px, 8vw, 42px);
          line-height: 1.04;
          font-weight: 950;
        }

        p:not(.eyebrow) {
          margin: 16px 0 0;
          color: #b8b8b8;
          font-size: 15px;
          line-height: 1.65;
        }

        .exit-button {
          min-height: 56px;
          margin-top: 24px;
          border-radius: 18px;
          border: 1px solid rgba(214,168,58,0.28);
          background: rgba(16,16,20,0.9);
          color: #f5d77a;
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 900;
        }
      `}</style>
    </main>
  );
}
