const problems = [
  {
    title: "Falta de organização",
    desc: "Informações espalhadas e processos manuais que geram retrabalho.",
  },
  {
    title: "Exposição desnecessária",
    desc: "Falta de controle sobre quem tem acesso às informações sensíveis.",
  },
  {
    title: "Dificuldade em gerenciar locais",
    desc: "Não há uma forma eficiente de cadastrar, organizar e controlar locais discretos.",
  },
  {
    title: "Pouco controle sobre clientes",
    desc: "É difícil acompanhar interações e manter um relacionamento seguro.",
  },
];

export default function Problems() {
  return (
    <section
      style={{
        padding: "96px 24px",
        background: "#0a0a0a",
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
          }}
        >
          O Problema
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            marginBottom: 56,
            letterSpacing: "-0.5px",
          }}
        >
          Desafios do mercado atual
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {problems.map((p, i) => (
            <div
              key={i}
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 12,
                padding: "24px 20px",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1.5px solid #cc0000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#cc0000"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ color: "#777", fontSize: 14, lineHeight: 1.6 }}>
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
