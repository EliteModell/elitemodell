"use client";
const cards = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    title: "Para modelos",
    desc: "Crie seu perfil, defina disponibilidade e tenha controle total da sua exposição.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    title: "Para imóveis",
    desc: "Cadastre, gerencie e controle a visibilidade dos seus imóveis com facilidade.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="8" r="3" />
        <path d="M1 20c0-3.3 3-6 8-6" />
        <path d="M15 20c0-3.3 3-6 6-6" />
        <path d="M9 14c2.7 0 5 2 5 5" />
      </svg>
    ),
    title: "Para clientes",
    desc: "Acesse perfis e imóveis de forma rápida, segura e com total praticidade.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
    title: "Para administração",
    desc: "Gerencie usuários, conteúdos e acessos com ferramentas completas.",
  },
];

export default function ForWho() {
  return (
    <section
      id="para-quem"
      style={{ padding: "96px 24px", background: "#0d0d0d" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
          Para quem é
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            marginBottom: 16,
            letterSpacing: "-0.5px",
          }}
        >
          Uma plataforma completa para todos
        </h2>
        <p style={{ color: "#888", fontSize: 16, marginBottom: 56, maxWidth: 480 }}>
          Soluções pensadas para cada tipo de usuário, com controle, praticidade
          e segurança.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "#141414",
                border: "1px solid #222",
                borderRadius: 12,
                padding: "28px 24px",
                transition: "border-color 0.2s, transform 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#cc0000";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#222";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ color: "#cc0000", marginBottom: 16 }}>{card.icon}</div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: "#fff",
                }}
              >
                {card.title}
              </h3>
              <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
