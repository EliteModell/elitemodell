"use client";
import { useEffect, useState } from "react";

export default function AgeGate() {
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
        background: "rgba(4,10,20,0.98)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#0b1420",
          border: "1px solid #1e293b",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.05)",
        }}
      >
        {/* Linha dourada no topo */}
        <div
          style={{
            height: 2,
            background:
              "linear-gradient(90deg, transparent 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, transparent 100%)",
          }}
        />

        <div style={{ padding: "40px 32px 36px", textAlign: "center" }}>
          {/* Logo */}
          <div style={{ marginBottom: 32, display: "inline-block", position: "relative", padding: "6px 20px", border: "1.5px solid rgba(201,168,76,0.3)", borderRadius: 10, background: "rgba(201,168,76,0.04)" }}>
            <span style={{ position: "absolute", top: -10, right: -4, color: "#c9a84c", fontSize: 15, lineHeight: 1 }}>✦</span>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
              <span style={{ color: "#cc0000" }}>elite</span>
              <span style={{ color: "#f1f5f9" }}>modell</span>
            </span>
          </div>

          {/* Badge 18+ */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                border: "2px solid #c9a84c",
                background: "rgba(201,168,76,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 32px rgba(201,168,76,0.1)",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 900, color: "#c9a84c", letterSpacing: "-1px", lineHeight: 1 }}>
                18+
              </span>
            </div>
          </div>

          <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.3px" }}>
            Conteúdo para adultos
          </h2>

          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.75, margin: "0 0 30px" }}>
            Este site é destinado exclusivamente a maiores de 18 anos.
            <br />
            Ao continuar, você confirma sua maioridade e concorda com os{" "}
            <span style={{ color: "#c9a84c", cursor: "pointer" }}>Termos de Uso</span>.
          </p>

          <button
            onClick={confirm}
            style={{
              width: "100%",
              padding: "15px",
              background: "#cc0000",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 10,
              letterSpacing: "0.2px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
          >
            Tenho 18 anos ou mais
          </button>

          <button
            onClick={deny}
            style={{
              width: "100%",
              padding: "12px",
              background: "transparent",
              color: "#334155",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Não tenho 18 anos
          </button>
        </div>
      </div>
    </div>
  );
}
