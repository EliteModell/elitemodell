"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const GOLD = "#b72cff";
const CONSENT_KEY = "elite_modell_adult_consent_session";
const CONSENT_DATE_KEY = "elite_modell_adult_consent_at";
const CONSENT_PERSIST_KEY = "elite_modell_ageConsentAccepted";
const CONSENT_PERSIST_DATE_KEY = "elite_modell_ageConsentAcceptedAt";
const DECLINED_KEY = "elite_modell_adult_consent_declined";
const SAFE_EXIT_PATH = "/saida";

function shouldSkipGate(pathname: string | null) {
  if (!pathname) return true;
  if (pathname === SAFE_EXIT_PATH) return true;

  return [
    "/profissional",
    "/modelo",
    "/cadastro/acompanhante",
    "/cadastro-modelo",
    "/anfitriao",
    "/cadastro-anfitriao",
    "/painel/acompanhante",
    "/painel/anfitriao",
    "/verificacao/acompanhante",
    "/verificacao/anfitriao",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function hasAdultConsent() {
  try {
    return Boolean(sessionStorage.getItem(CONSENT_KEY) || localStorage.getItem(CONSENT_PERSIST_KEY));
  } catch {
    return false;
  }
}

export default function AgeGate() {
  const pathname = usePathname();
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [accepted, setAccepted] = useState(() => hasAdultConsent());
  const visible = !shouldSkipGate(pathname) && !accepted;

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => acceptButtonRef.current?.focus(), 80);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function acceptConsent() {
    const acceptedAt = new Date().toISOString();
    sessionStorage.setItem(CONSENT_KEY, "accepted");
    sessionStorage.setItem(CONSENT_DATE_KEY, acceptedAt);
    localStorage.setItem(CONSENT_PERSIST_KEY, "true");
    localStorage.setItem(CONSENT_PERSIST_DATE_KEY, acceptedAt);
    sessionStorage.removeItem(DECLINED_KEY);
    setAccepted(true);
  }

  function declineConsent() {
    sessionStorage.setItem(DECLINED_KEY, new Date().toISOString());
    sessionStorage.removeItem(CONSENT_KEY);
    window.location.assign(SAFE_EXIT_PATH);
  }

  if (!visible) return null;

  return (
    <div className="age-gate" role="presentation">
      <div
        ref={dialogRef}
        className="age-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
        onKeyDown={handleKeyDown}
      >
        <div className="gold-line" />

        <div className="age-content">
          <div className="age-logo" aria-label="Elite Modell">
            <BrandMark priority />
          </div>

          <div className="adult-badge" aria-hidden="true">
            <AlertTriangle size={24} />
            <span>18+</span>
          </div>

          <p className="eyebrow">Acesso restrito</p>
          <h2 id="age-gate-title">Aviso importante antes de continuar</h2>
          <p id="age-gate-description" className="age-intro">
            Este ambiente é destinado exclusivamente a maiores de 18 anos. Ao continuar, você confirma que possui 18 anos ou
            mais e que está ciente de que poderá visualizar conteúdo e anúncios voltados ao público adulto, sempre de acordo
            com os <Link href="/terms">Termos de Uso</Link> e a <Link href="/privacy">Política de Privacidade</Link> da plataforma.
          </p>

          <div className="privacy-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>A Elite Modell prioriza discrição, segurança e respeito à privacidade.</span>
          </div>

          <div className="actions">
            <button ref={acceptButtonRef} className="continue-button" onClick={acceptConsent} type="button">
              Aceitar e continuar
            </button>

            <button className="deny-button" onClick={declineConsent} type="button">
              Recusar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .age-gate {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
          background:
            radial-gradient(circle at 50% 0%, rgba(183, 44, 255, 0.18), transparent 34%),
            radial-gradient(circle at 12% 84%, rgba(183, 44, 255, 0.10), transparent 30%),
            rgba(0, 0, 0, 0.88);
          color: #fff;
          backdrop-filter: blur(18px);
        }

        .age-card {
          width: min(100%, 430px);
          max-height: min(92dvh, 720px);
          overflow-y: auto;
          border: 1px solid rgba(183, 44, 255, 0.28);
          border-radius: 26px;
          background:
            radial-gradient(circle at 50% 0%, rgba(213, 108, 255, 0.10), transparent 36%),
            linear-gradient(180deg, rgba(20, 20, 20, 0.98), rgba(8, 8, 9, 0.99));
          box-shadow: 0 34px 100px rgba(0, 0, 0, 0.72), 0 0 54px rgba(183, 44, 255, 0.10);
          outline: none;
        }

        .gold-line {
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, ${GOLD} 30%, #e1a6ff 50%, ${GOLD} 70%, transparent 100%);
        }

        .age-content {
          padding: 28px 22px 22px;
          text-align: center;
        }

        .age-logo {
          display: inline-grid;
          align-items: center;
          width: min(208px, 64vw);
          margin-bottom: 24px;
          padding: 8px 14px;
          border: 1px solid rgba(183, 44, 255, 0.28);
          border-radius: 18px;
          background: rgba(11, 8, 15, 0.86);
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.28);
        }

        .age-logo span {
          background: linear-gradient(135deg, #f4d7ff 0%, #b72cff 28%, #e1a6ff 55%, #6900a3 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .age-logo strong {
          color: #fff;
          font: inherit;
        }

        .adult-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 96px;
          min-height: 54px;
          margin: 0 auto 18px;
          border: 1px solid rgba(213, 108, 255, 0.58);
          border-radius: 999px;
          background: rgba(183, 44, 255, 0.09);
          color: #e1a6ff;
          font-size: 21px;
          font-weight: 950;
          box-shadow: 0 0 34px rgba(183, 44, 255, 0.13);
        }

        .eyebrow {
          margin: 0 0 10px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(25px, 7vw, 34px);
          line-height: 1.04;
          font-weight: 950;
          letter-spacing: 0;
          text-wrap: balance;
        }

        .age-intro {
          margin: 16px 0 0;
          color: #b8b8b8;
          font-size: 14px;
          line-height: 1.65;
        }

        .age-intro a {
          color: #e1a6ff;
          font-weight: 800;
          text-decoration: none;
        }

        .age-intro a:focus-visible,
        .continue-button:focus-visible,
        .deny-button:focus-visible {
          outline: 3px solid rgba(213, 108, 255, 0.46);
          outline-offset: 3px;
        }

        .privacy-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 18px 0 0;
          border: 1px solid rgba(183, 44, 255, 0.22);
          border-left: 4px solid ${GOLD};
          border-radius: 18px;
          background: rgba(16, 16, 20, 0.82);
          padding: 14px;
          color: #d7d7d7;
          text-align: left;
          font-size: 13px;
          line-height: 1.5;
        }

        .privacy-note svg {
          flex: 0 0 auto;
          color: #e1a6ff;
          margin-top: 1px;
        }

        .actions {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .continue-button,
        .deny-button {
          width: 100%;
          border-radius: 18px;
          cursor: pointer;
          font-family: inherit;
          transition: transform 160ms ease, border-color 160ms ease, filter 160ms ease;
        }

        .continue-button {
          min-height: 58px;
          border: 0;
          background: linear-gradient(135deg, #e1a6ff, ${GOLD} 46%, #6900a3);
          color: #070707;
          font-size: 15px;
          font-weight: 950;
          box-shadow: 0 20px 52px rgba(183, 44, 255, 0.24);
        }

        .deny-button {
          min-height: 52px;
          border: 1px solid rgba(183, 44, 255, 0.22);
          background: rgba(11, 11, 13, 0.82);
          color: #f2f2f2;
          font-size: 14px;
          font-weight: 850;
        }

        .continue-button:hover,
        .deny-button:hover {
          filter: brightness(1.06);
        }

        .continue-button:active,
        .deny-button:active {
          transform: translateY(1px);
        }

        @media (max-width: 420px) {
          .age-gate {
            padding-left: 12px;
            padding-right: 12px;
          }

          .age-card {
            border-radius: 22px;
          }

          .age-content {
            padding: 24px 18px 18px;
          }

          .age-logo {
            margin-bottom: 20px;
          }

          .adult-badge {
            min-width: 88px;
            min-height: 50px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
