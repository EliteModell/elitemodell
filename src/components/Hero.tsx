"use client";

export default function Hero() {
  return (
    <>
      <section
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

      {/* Botões mobile — só aparecem no celular */}
      <div className="hero-mobile-btns" style={{ display: "none" }}>
        <a
          href="/login"
          style={{
            display: "block",
            padding: "14px 20px",
            background: "transparent",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Entrar
        </a>
        <a
          href="/cadastro"
          style={{
            display: "block",
            padding: "14px 20px",
            background: "#cc0000",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Cadastrar agora
        </a>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .hero-mobile-btns {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            padding: 20px 20px 8px;
            background: #0d0d0d;
          }
        }
      `}</style>
    </>
  );
}
