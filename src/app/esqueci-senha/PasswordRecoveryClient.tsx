"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function PasswordRecoveryClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Informe um email valido.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Nao foi possivel enviar o link.");
      }
      setSent(true);
      toast.success("Se o email existir, enviaremos o link de recuperacao.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel enviar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.06) 0%, #050505 60%)", color: "#f1f5f9", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 430, background: "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98))", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 20, padding: 30, boxShadow: "0 24px 70px rgba(0,0,0,0.34)" }}>
        <Link href="/" aria-label="Elite Modell" style={{ display: "inline-flex", alignItems: "baseline", textDecoration: "none", fontSize: 26, fontWeight: 950, marginBottom: 24 }}>
          <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
          <strong style={{ color: "#fff", font: "inherit" }}>modell</strong>
        </Link>

        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: "0 0 10px" }}>Recuperar senha</h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px" }}>
          Digite seu email e enviaremos um link seguro para criar uma nova senha.
        </p>

        {sent ? (
          <div style={{ border: "1px solid rgba(212,168,67,0.28)", background: "rgba(212,168,67,0.08)", borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <p style={{ color: "#f5d78c", fontWeight: 800, margin: "0 0 6px" }}>Confira sua caixa de entrada.</p>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              Se houver conta para esse email, o link chegou ou chegara em instantes. Veja tambem a pasta de spam.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              style={{ minHeight: 54, borderRadius: 14, border: "1px solid rgba(212,168,67,0.28)", background: "#0b0b0d", color: "#fff", padding: "13px 15px", fontSize: 15, outline: "none" }}
            />
          </label>

          <button type="submit" disabled={loading} style={{ minHeight: 54, border: 0, borderRadius: 14, background: GOLD, color: "#070707", fontWeight: 950, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.68 : 1 }}>
            {loading ? "Enviando..." : "Enviar link de recuperacao"}
          </button>
        </form>

        <Link href={ACCOUNT_ROUTES.login} style={{ display: "block", marginTop: 18, color: GOLD, textDecoration: "none", fontWeight: 800, textAlign: "center" }}>
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
