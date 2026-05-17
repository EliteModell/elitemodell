"use client";
const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    title: "Perfis de modelos",
    desc: "Modelos criam seus perfis completos, definem disponibilidade e controlam sua exposição.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    title: "Cadastro de locais discretos",
    desc: "Cadastre locais, gerencie disponibilidade, associe com perfis e controle visibilidade.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="8" r="3" />
        <path d="M1 20c0-3.3 3-6 8-6" />
        <path d="M15 20c0-3.3 3-6 6-6" />
      </svg>
    ),
    title: "Acesso para clientes",
    desc: "Clientes e profissionais acessam perfis e quartos de forma simples, rápida e segura.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: "Painel administrativo",
    desc: "Controle total da plataforma, usuários, espaços, permissões e muito mais.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "Controle de visibilidade",
    desc: "Decida o que mostrar ou ocultar. Você tem o controle total.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Segurança avançada",
    desc: "Dados protegidos com criptografia e tecnologia de ponta em cada acesso.",
  },
];

export default function Solution() {
  return (
    <section
      id="solucao"
      style={{
        padding: "96px 24px",
        background: "#0d0d0d",
        borderTop: "1px solid #181818",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
          className="solution-grid"
        >
          {/* Left */}
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#cc0000",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              A Solução
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                marginBottom: 20,
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
              }}
            >
              Tudo que você precisa em um só lugar
            </h2>
            <p style={{ color: "#888", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Nossa plataforma resolve todos esses problemas em um só lugar, com
              segurança, praticidade e controle total.
            </p>
            <a
              href="#contato"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                background: "#cc0000",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Quero fazer parte
            </a>
          </div>

          {/* Right */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  background: "#111",
                  border: "1px solid #1e1e1e",
                  borderRadius: 10,
                  padding: "16px 18px",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "#cc000050")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")
                }
              >
                <div style={{ color: "#cc0000", flexShrink: 0, marginTop: 2 }}>
                  {f.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    {f.title}
                  </h4>
                  <p style={{ color: "#777", fontSize: 13, lineHeight: 1.5 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .solution-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
