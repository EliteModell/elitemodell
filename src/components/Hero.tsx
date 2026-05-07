"use client";

export default function Hero() {
  return (
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
        className="hero-img"
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

      <style>{`
        @media (max-width: 767px) {
          .hero-img {
            min-height: 260px !important;
            object-fit: cover !important;
            object-position: center top !important;
          }
        }
      `}</style>
    </section>
  );
}
