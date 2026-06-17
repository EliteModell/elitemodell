"use client";

import type { CSSProperties } from "react";
import { LEGAL_CHANNELS, PUBLIC_FOOTER_LEGAL_LINKS } from "@/lib/legal-document-catalog";

const platformLinks = ["Para quem e", "A Solucao", "Como funciona", "Visao"];
const socialLinks = [
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: "WhatsApp", href: process.env.NEXT_PUBLIC_WHATSAPP_URL },
  { label: "TikTok", href: process.env.NEXT_PUBLIC_TIKTOK_URL },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL },
  { label: "Telegram", href: process.env.NEXT_PUBLIC_TELEGRAM_URL },
];

function SocialIcon({ label }: { label: string }) {
  if (label === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" />
      </svg>
    );
  }

  if (label === "WhatsApp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.3-4.3a8.5 8.5 0 1 1 15.7-4.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 7.5c.3-.4.6-.4.9-.4h.4c.2 0 .4.1.5.5l.8 1.9c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.5 0 .7.7 1.3 1.7 2.3 3 3 .3.2.5.2.7 0l.9-1.1c.2-.3.5-.3.8-.2l1.9.9c.3.2.5.3.5.5 0 .3-.1 1.5-.8 2.1-.6.6-1.5.9-2.4.7-1-.2-2.4-.7-4.1-2.2-1.4-1.2-2.4-2.7-2.8-3.7-.4-1-.1-2.1.4-2.7Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (label === "TikTok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15.4 3c.4 3 2.1 4.8 4.9 5v3.3a8.3 8.3 0 0 1-4.8-1.5v5.9c0 3.2-2.2 5.4-5.4 5.4-3 0-5.4-2.1-5.4-5.1 0-3.3 2.5-5.5 6.2-5.2v3.4c-1.7-.3-2.8.4-2.8 1.8 0 1.2.9 2 2.1 2 1.3 0 2-.8 2-2.4V3h3.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (label === "YouTube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 8.1a2.8 2.8 0 0 0-2-2C17.2 5.6 12 5.6 12 5.6s-5.2 0-7 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.5 12 29 29 0 0 0 3 15.9a2.8 2.8 0 0 0 2 2c1.8.5 7 .5 7 .5s5.2 0 7-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-3.9 29 29 0 0 0-.5-3.9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 4.7 18 19.1c-.2 1-1 1.2-1.8.7l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9 8.9-8c.4-.3-.1-.5-.6-.2L5.7 12.8.9 11.3c-1-.3-1-1 .2-1.5L19.8 2.6c.9-.3 1.6.2 1.2 2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer
      style={{
        background: "#050505",
        borderTop: "1px solid rgba(212,168,67,0.14)",
        padding: "48px 24px 32px",
      }}
    >
      <style>{`
        .footer-link {
          display: block;
          color: #8d8578;
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 8px;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: #f4f1ea;
        }
        .social-link {
          position: relative;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(212,168,67,0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d4a843;
          text-decoration: none;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(245,215,140,0.13), transparent 58%),
            linear-gradient(145deg, rgba(22,20,15,0.98), rgba(8,8,8,0.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 30px rgba(0,0,0,0.24);
          transition: color 0.25s ease, border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .social-link::before {
          content: "";
          position: absolute;
          inset: -45%;
          background: linear-gradient(120deg, transparent 38%, rgba(255,229,160,0.20) 50%, transparent 62%);
          transform: translateX(-65%) rotate(12deg);
          transition: transform 0.5s ease;
        }
        .social-link svg {
          position: relative;
          z-index: 1;
          width: 22px;
          height: 22px;
        }
        .social-link:hover {
          color: #ffe5a0;
          border-color: rgba(245,215,140,0.58);
          transform: translateY(-3px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 16px 36px rgba(212,168,67,0.13);
        }
        .social-link:hover::before {
          transform: translateX(65%) rotate(12deg);
        }
        .social-link:focus-visible {
          outline: 2px solid #f5d78c;
          outline-offset: 3px;
        }
        .social-link[aria-disabled="true"] {
          cursor: default;
        }
        @media (max-width: 560px) {
          .social-links {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            width: min(100%, 300px);
            gap: 10px !important;
          }
          .social-link {
            width: 100%;
            min-width: 44px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .social-link,
          .social-link::before {
            transition: none;
          }
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 32,
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          <div style={{ maxWidth: 280 }}>
            <a
              href="#"
              style={{
                textDecoration: "none",
                position: "relative",
                display: "inline-block",
                padding: "6px 16px",
                border: "1.5px solid rgba(212,170,99,0.5)",
                borderRadius: 8,
                background: "rgba(201,168,76,0.04)",
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: 0 }}>
                <span
                  style={{
                    background: "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 50%, #9e7b2a 75%, #d4a843 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  elite
                </span>
                <span style={{ color: "#f4f1ea" }}>modell</span>
              </span>
            </a>
            <p style={{ color: "#8d8578", fontSize: 13, lineHeight: 1.7 }}>
              A plataforma que conecta acompanhantes, clientes e quartos discretos com
              seguranca, privacidade e controle.
            </p>
          </div>

          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <h4 style={headingStyle}>Plataforma</h4>
              {platformLinks.map((label) => (
                <a key={label} href="#" className="footer-link">
                  {label}
                </a>
              ))}
            </div>
            <div>
              <h4 style={headingStyle}>Legal</h4>
              {PUBLIC_FOOTER_LEGAL_LINKS.map(({ label, href }) => (
                <a key={label} href={href} className="footer-link">
                  {label}
                </a>
              ))}
              <a href="/dashboard/privacidade" className="footer-link">Privacidade e meus dados</a>
              <button
                type="button"
                className="footer-link"
                onClick={() => window.dispatchEvent(new Event("elite-open-cookie-settings"))}
                style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
              >
                Configuracoes de cookies
              </button>
              <a href={`mailto:${LEGAL_CHANNELS.privacy}`} className="footer-link">Canal de Privacidade</a>
              <a href={`mailto:${LEGAL_CHANNELS.security}`} className="footer-link">Canal de Seguranca/Denuncias</a>
              <a href={`mailto:${LEGAL_CHANNELS.support}`} className="footer-link">Suporte geral</a>
            </div>
          </div>

          <div>
            <h4 style={headingStyle}>Redes sociais</h4>
            <div className="social-links" style={{ display: "flex", gap: 12 }}>
              {socialLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href || undefined}
                  aria-label={label}
                  aria-disabled={!href}
                  className="social-link"
                  target={href ? "_blank" : undefined}
                  rel={href ? "noreferrer noopener" : undefined}
                  onClick={href ? undefined : (event) => event.preventDefault()}
                  title={href ? label : `${label}: canal em configuracao`}
                >
                  <SocialIcon label={label} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(212,168,67,0.12)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ color: "#8d8578", fontSize: 13 }}>
            &copy; 2026 Elite Modell. Todos os direitos reservados.
          </span>
          <span style={{ color: "#615b52", fontSize: 13 }}>
            Rascunhos juridicos sujeitos a revisao da advogada.
          </span>
        </div>
      </div>
    </footer>
  );
}

const headingStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#d4a843",
  letterSpacing: 0,
  textTransform: "uppercase",
  marginBottom: 16,
  fontFamily: "var(--font-playfair), serif",
};
