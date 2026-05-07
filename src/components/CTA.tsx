"use client";
export default function CTA() {
  return (
    <section
      id="contato"
      style={{
        padding: "96px 24px",
        background: "linear-gradient(135deg, #1a0000 0%, #0d0d0d 60%)",
        borderTop: "1px solid #2a0000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 300,
          borderRadius: "50%",
          background: "rgba(204,0,0,0.08)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#cc0000",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Faça parte
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 5vw, 52px)",
            fontWeight: 800,
            marginBottom: 20,
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Pronto para fazer parte de uma nova geração de plataformas?
        </h2>
        <p
          style={{
            color: "#888",
            fontSize: 17,
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          Junte-se a nós e transforme o mercado com tecnologia, segurança e
          inovação.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="mailto:contato@elitemodell.com"
            style={{
              padding: "15px 32px",
              background: "#cc0000",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
              transition: "background 0.2s, transform 0.1s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#e00000";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#cc0000";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            Entrar em contato
          </a>
          <a
            href="mailto:contato@elitemodell.com"
            style={{
              padding: "15px 32px",
              background: "transparent",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
              transition: "border-color 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            Solicitar acesso antecipado
          </a>
        </div>
      </div>
    </section>
  );
}
