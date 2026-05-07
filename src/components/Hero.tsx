"use client";

export default function Hero() {
  return (
    <>
      {/* Desktop: imagem original full-width */}
      <section
        className="hero-desktop"
        style={{
          position: "relative",
          width: "100%",
          marginTop: 64,
          background: "#0d0d0d",
          lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-model.jpeg"
          alt=""
          aria-hidden="true"
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* Cobre o "02" */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "clamp(28px, 8vw, 115px)",
            height: "clamp(28px, 8vw, 115px)",
            background: "#0a0100",
            zIndex: 2,
          }}
        />

        {/* Fade inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: "linear-gradient(to top, #0d0d0d, transparent)",
            zIndex: 1,
          }}
        />
      </section>

      {/* Mobile: fundo com modelo + texto HTML por cima */}
      <section
        className="hero-mobile"
        style={{
          position: "relative",
          width: "100%",
          marginTop: 64,
          minHeight: 580,
          backgroundImage: "url('/hero-model.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "70% top",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* Overlay escuro para legibilidade */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(10,1,0,0.75) 0%, rgba(10,1,0,0.2) 100%)",
          }}
        />

        {/* Conteúdo */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 20px 40px", width: "100%" }}>
          {/* Logo card */}
          <div style={{ display: "inline-block", position: "relative", padding: "5px 14px", border: "1.5px solid rgba(212,170,99,0.6)", borderRadius: 8, background: "rgba(8,4,0,0.7)", marginBottom: 16 }}>
            <span style={{ position: "absolute", top: -9, right: -4, color: "#d4a843", fontSize: 14, lineHeight: 1 }}>✦</span>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.5px" }}>
              <span style={{ color: "#cc0000" }}>elite</span>
              <span style={{ color: "#fff" }}>modell</span>
            </span>
          </div>

          <div style={{ width: 40, height: 2, background: "#c9963a", marginBottom: 14 }} />

          <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.15, marginBottom: 12, textTransform: "uppercase", letterSpacing: "-0.5px" }}>
            Sua conexão com o{" "}
            <span style={{ color: "#c9963a" }}>melhor, de forma discreta.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            A plataforma ideal para quem busca companhia, momentos especiais e atendimento de alto nível.
          </p>

          <a
            href="#contato"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#cc0000",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Cadastrar agora
          </a>
        </div>

        {/* Fade inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "linear-gradient(to top, #0d0d0d, transparent)",
          }}
        />
      </section>

      <style>{`
        .hero-desktop { display: block; }
        .hero-mobile  { display: none; }
        @media (max-width: 767px) {
          .hero-desktop { display: none; }
          .hero-mobile  { display: flex; }
        }
      `}</style>
    </>
  );
}
