"use client";
const reasons = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
      </svg>
    ),
    title: "Privacidade total",
    desc: "Você decide quem tem acesso a cada informação.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Segurança avançada",
    desc: "Seus dados protegidos com criptografia e tecnologia de ponta.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Plataforma intuitiva",
    desc: "Interface moderna, fácil de usar e totalmente responsiva.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    title: "Escalável",
    desc: "Uma solução pronta para crescer junto com o seu negócio.",
  },
];

export default function WhyChoose() {
  return (
    <section
      style={{
        padding: "96px 24px",
        background: "#0d0d0d",
        borderTop: "1px solid #181818",
      }}
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
            textAlign: "center",
          }}
        >
          Por que escolher nossa plataforma?
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            marginBottom: 64,
            textAlign: "center",
            letterSpacing: "-0.5px",
          }}
        >
          Construída para quem exige o melhor
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
          }}
        >
          {reasons.map((r) => (
            <div
              key={r.title}
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 14,
                padding: "32px 24px",
                textAlign: "center",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#cc0000";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  background: "rgba(204,0,0,0.1)",
                  border: "1px solid rgba(204,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "#cc0000",
                }}
              >
                {r.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#fff" }}>
                {r.title}
              </h3>
              <p style={{ color: "#777", fontSize: 14, lineHeight: 1.6 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
