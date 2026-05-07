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
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />

      {/* Cobre o "02" */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 110,
          height: 110,
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
