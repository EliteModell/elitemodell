const stats = [
  { value: "100%", label: "Privacidade garantida" },
  { value: "24/7", label: "Suporte disponível" },
  { value: "0", label: "Taxas ocultas" },
  { value: "SSL", label: "Segurança total" },
];

const checkItems = [
  "Modelo de negócio escalável",
  "Estrutura robusta e segura",
  "Tecnologia de última geração",
  "Foco em crescimento e inovação",
];

export default function Vision() {
  return (
    <section
      id="visao"
      style={{
        padding: "96px 24px",
        background: "#0a0a0a",
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
          className="vision-grid"
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
              Visão do projeto
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
              Construindo o futuro do mercado
            </h2>
            <p style={{ color: "#888", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Nossa missão é transformar a forma como pessoas, locais e
              oportunidades se conectam, criando um ecossistema seguro, eficiente
              e altamente lucrativo.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {checkItems.map((item) => (
                <div
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: "#cc0000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ color: "#ccc", fontSize: 15 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Stats */}
          <div>
            {/* City image placeholder */}
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 24,
                height: 200,
                background:
                  "linear-gradient(135deg, #0a0a1a 0%, #1a0a0a 50%, #0d0d0d 100%)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #222",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse at center bottom, rgba(204,0,0,0.15) 0%, transparent 70%)",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: "#444",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Elite Modell — Plataforma
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#111",
                    border: "1px solid #1e1e1e",
                    borderRadius: 12,
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#cc0000",
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 13, color: "#888" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .vision-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
