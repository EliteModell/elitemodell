"use client";
import { useEffect, useState } from "react";
import { isAgeOfMajority, isValidBirthDate, getMaxBirthDate } from "@/lib/age-validation";

export default function AgeGate() {
  const [visible, setVisible] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");

  const GOLD = "#d4a843";

  useEffect(() => {
    // Verificar se sessão já tem validação de idade
    const verified = sessionStorage.getItem("age_verified_session");
    if (verified) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, []);

  function handleConfirm() {
    if (!birthDate) {
      setError("Digite sua data de nascimento");
      return;
    }

    if (!isValidBirthDate(birthDate)) {
      setError("Data de nascimento inválida");
      return;
    }

    if (!isAgeOfMajority(birthDate)) {
      setError("Você deve ter 18 anos ou mais");
      return;
    }

    // Armazenar validação na sessão
    sessionStorage.setItem("age_verified_session", "1");
    sessionStorage.setItem("age_verified_date", new Date().toISOString());
    setVisible(false);
  }

  function handleDeny() {
    window.location.href = "https://www.google.com";
  }

  if (!visible) return null;

  const maxDate = getMaxBirthDate();

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
        {/* Linha dourada */}
        <div
          style={{
            height: 2,
            background: "linear-gradient(90deg, transparent 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, transparent 100%)",
          }}
        />

        <div style={{ padding: "40px 32px 36px", textAlign: "center" }}>
          {/* Logo */}
          <div style={{ marginBottom: 32, display: "inline-block", position: "relative", padding: "6px 20px", border: "1.5px solid rgba(201,168,76,0.3)", borderRadius: 10, background: "rgba(201,168,76,0.04)" }}>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
              <span style={{ background: "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
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
              <span style={{ fontSize: 28, fontWeight: 900, color: "#c9a84c" }}>18+</span>
            </div>
          </div>

          <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>
            Conteúdo para adultos
          </h2>

          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.75, margin: "0 0 28px" }}>
            Este site é destinado exclusivamente a maiores de 18 anos.
          </p>

          {/* Data de nascimento */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textAlign: "left" }}>
              Data de Nascimento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                setError("");
              }}
              max={maxDate}
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "#0f172a",
                border: error ? "1px solid #dc2626" : "1px solid #1e293b",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 14,
                boxSizing: "border-box",
                outline: "none",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
            {error && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "8px 0 0", textAlign: "left" }}>
                {error}
              </p>
            )}
          </div>

          <button
            onClick={handleConfirm}
            style={{
              width: "100%",
              padding: "15px",
              background: "#d4a843",
              color: "#060e1b",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 10,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8bb47")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#d4a843")}
          >
            Continuar
          </button>

          <button
            onClick={handleDeny}
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

          <p style={{ fontSize: 11, color: "#475569", margin: "20px 0 0", lineHeight: 1.6 }}>
            Ao continuar, você confirma sua maioridade e concorda com nossos <a href="/terms" style={{ color: "#c9a84c", textDecoration: "none" }}>Termos de Uso</a> e <a href="/privacy" style={{ color: "#c9a84c", textDecoration: "none" }}>Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
