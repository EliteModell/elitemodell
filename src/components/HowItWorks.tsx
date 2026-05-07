const steps = [
  {
    num: "01",
    title: "Cadastre-se",
    desc: "Crie sua conta como modelo, cliente ou administrador.",
  },
  {
    num: "02",
    title: "Configure seu perfil",
    desc: "Adicione informações, fotos, preferências e locais.",
  },
  {
    num: "03",
    title: "Defina permissões",
    desc: "Escolha quem pode ver cada informação e quando.",
  },
  {
    num: "04",
    title: "Conecte-se",
    desc: "Encontre oportunidades com segurança e praticidade.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
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
            textAlign: "center",
          }}
        >
          Como funciona
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            marginBottom: 64,
            letterSpacing: "-0.5px",
            textAlign: "center",
          }}
        >
          Simples, rápido e eficiente
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 0,
            position: "relative",
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "0 24px",
                position: "relative",
              }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 28,
                    left: "50%",
                    width: "100%",
                    height: 1,
                    background: "linear-gradient(to right, #cc0000, #333)",
                    zIndex: 0,
                  }}
                  className="connector-line"
                />
              )}

              {/* Circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#cc0000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: "0 0 24px rgba(204,0,0,0.3)",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {step.num}
                </span>
              </div>

              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </h3>
              <p style={{ color: "#777", fontSize: 14, lineHeight: 1.6, maxWidth: 200 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .connector-line { display: none !important; }
        }
      `}</style>
    </section>
  );
}
