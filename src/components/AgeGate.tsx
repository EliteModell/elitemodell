"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgeGate() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem("age_verified");
    if (!verified) setVisible(true);
  }, []);

  function confirm() {
    localStorage.setItem("age_verified", "1");
    setVisible(false);
  }

  function deny() {
    window.location.href = "https://www.google.com";
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.96)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 20,
          padding: "48px 36px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "#fff",
            border: "4px solid #cc0000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 40px rgba(204,0,0,0.3)",
          }}>
            {/* linha diagonal vermelha */}
            <div style={{
              position: "absolute",
              width: "130%",
              height: 4,
              background: "#cc0000",
              transform: "rotate(-45deg)",
              top: "50%",
              left: "-15%",
              marginTop: -2,
            }} />
            <span style={{
              color: "#111",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: -2,
              lineHeight: 1,
              position: "relative",
              zIndex: 1,
            }}>
              18
            </span>
          </div>
        </div>

        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>
          Conteúdo adulto
        </h2>

        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
          Este site contém conteúdo restrito para maiores de 18 anos.
        </p>
        <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
          Ao continuar, você confirma que tem 18 anos ou mais e concorda com nossos{" "}
          <span style={{ color: "#cc0000" }}>Termos de Uso</span>.
        </p>

        <button
          onClick={confirm}
          style={{
            width: "100%",
            padding: "14px",
            background: "#cc0000",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Sim, tenho 18 anos ou mais
        </button>

        <button
          onClick={deny}
          style={{
            width: "100%",
            padding: "14px",
            background: "transparent",
            color: "#555",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Não, sou menor de idade
        </button>
      </div>
    </div>
  );
}
