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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-model.jpeg"
        alt=""
        aria-hidden="true"
        style={{
          width: "100%",
          height: "auto",
          minHeight: 320,
          objectFit: "cover",
          objectPosition: "center top",
          display: "block",
        }}
      />

      {/* Cobre o "02" */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "6vw",
          height: "6vw",
          minWidth: 40,
          minHeight: 40,
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
  );
}
