"use client";

import { useState } from "react";

export default function AdminSetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSetup() {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setMessage(data.message ?? "Sucesso!");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Erro desconhecido.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050506", padding: 24 }}>
      <div style={{
        width: "100%", maxWidth: 420, background: "#0d0d10",
        border: "1px solid rgba(212,168,67,0.22)", borderRadius: 12,
        padding: "40px 32px 36px", textAlign: "center",
      }}>
        <p style={{ color: "#d4a843", fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", margin: "0 0 16px" }}>
          Configuração Inicial
        </p>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>
          Ativar Acesso Admin
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "0 0 32px", lineHeight: 1.6 }}>
          Clique para se tornar administrador. Funciona apenas uma vez, enquanto não existir nenhum admin no sistema.
        </p>

        {status === "idle" && (
          <button onClick={handleSetup} style={{
            width: "100%", padding: "13px 20px", background: "#d4a843",
            border: "none", borderRadius: 8, color: "#0a0a0a",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>
            Tornar-me ADMIN
          </button>
        )}

        {status === "loading" && (
          <p style={{ color: "#d4a843", fontSize: 14 }}>Processando...</p>
        )}

        {status === "done" && (
          <>
            <p style={{ color: "#4ade80", fontSize: 14, marginBottom: 20 }}>{message}</p>
            <a href="/admin/login" style={{
              display: "inline-block", padding: "11px 24px",
              background: "#d4a843", borderRadius: 8, color: "#0a0a0a",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
            }}>
              Ir para o login admin
            </a>
          </>
        )}

        {status === "error" && (
          <p style={{ color: "#f87171", fontSize: 14, padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8 }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
