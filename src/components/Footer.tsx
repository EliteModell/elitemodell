export default function Footer() {
  const socialLinks = [
    {
      label: "Instagram",
      href: "#",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: "#",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      ),
    },
    {
      label: "Twitter",
      href: "#",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
        </svg>
      ),
    },
    {
      label: "YouTube",
      href: "#",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
        </svg>
      ),
    },
  ];

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
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <a href="#" style={{ textDecoration: "none", position: "relative", display: "inline-block", padding: "6px 16px", border: "1.5px solid rgba(212,170,99,0.5)", borderRadius: 8, background: "rgba(201,168,76,0.04)", marginBottom: 12 }}>
              <span style={{ position: "absolute", top: -10, right: -5, color: "#d4a843", fontSize: 16, lineHeight: 1, userSelect: "none" }}>✦</span>
              <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: 0 }}>
                <span style={{
                  background: "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 50%, #9e7b2a 75%, #d4a843 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>elite</span>
                <span style={{ color: "#f4f1ea" }}>modell</span>
              </span>
            </a>
            <p style={{ color: "#8d8578", fontSize: 13, lineHeight: 1.7 }}>
              A plataforma que conecta acompanhantes, clientes e quartos discretos com
              segurança, privacidade e controle total.
            </p>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#d4a843", letterSpacing: 0, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-playfair), serif" }}>
                Plataforma
              </h4>
              {["Para quem é", "A Solução", "Como funciona", "Visão"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="footer-link"
                >
                  {l}
                </a>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#d4a843", letterSpacing: 0, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-playfair), serif" }}>
                Legal
              </h4>
              {["Política de privacidade", "Termos de uso", "LGPD"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="footer-link"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "#d4a843", letterSpacing: 0, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-playfair), serif" }}>
              Redes sociais
            </h4>
            <div style={{ display: "flex", gap: 12 }}>
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="social-link"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
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
            © 2026 Elite Modell. Todos os direitos reservados.
          </span>
          <span style={{ color: "#615b52", fontSize: 13 }}>
            Feito com tecnologia de ponta
          </span>
        </div>
      </div>
    </footer>
  );
}
