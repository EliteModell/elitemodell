"use client";

import type { CSSProperties } from "react";
import { LEGAL_CHANNELS, PUBLIC_FOOTER_LEGAL_LINKS } from "@/lib/legal-document-catalog";

const platformLinks = ["Para quem e", "A Solucao", "Como funciona", "Visao"];
const socialLinks = ["Instagram", "WhatsApp", "Twitter", "YouTube"];

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
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid rgba(212,168,67,0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8d8578;
          text-decoration: none;
          transition: color 0.2s, border-color 0.2s;
        }
        .social-link:hover {
          color: #d4a843;
          border-color: rgba(212,168,67,0.34);
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
            <div style={{ display: "flex", gap: 12 }}>
              {socialLinks.map((label) => (
                <a key={label} href="#" aria-label={label} className="social-link">
                  {label.slice(0, 1)}
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
