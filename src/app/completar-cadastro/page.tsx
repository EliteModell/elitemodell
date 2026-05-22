"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getMaxBirthDate } from "@/lib/age-validation";

const GOLD = "#d4a843";
const GOLD_GRADIENT =
  "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

export default function CompletarCadastroPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [birthDate, setBirthDate] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!lgpdConsent || !termsConsent) {
      setError("Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    if (!birthDate) {
      setError("Informe sua data de nascimento.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, lgpdConsent, termsConsent }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erro ao salvar dados.");
        return;
      }

      // Atualiza o token JWT para refletir needsConsent = false
      await updateSession();
      router.replace("/dashboard");
      setTimeout(() => router.refresh(), 150);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.06) 0%, #050505 60%)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(10,10,10,0.97)",
          border: "1px solid rgba(212,168,67,0.28)",
          borderRadius: 16,
          padding: "40px 32px 36px",
          position: "relative",
          boxShadow: "0 0 60px rgba(212,168,67,0.06), 0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Gold top line */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 2,
            borderRadius: "16px 16px 0 0",
            background:
              "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)",
          }}
        />

        {/* Logo */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-0.5px" }}>
            <span
              style={{
                background: GOLD_GRADIENT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              elite
            </span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </div>

        <h1
          style={{
            color: "#f1f5f9",
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 6px",
            textAlign: "center",
          }}
        >
          Complete seu cadastro
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 13,
            textAlign: "center",
            margin: "0 0 28px",
            lineHeight: 1.5,
          }}
        >
          Para acessar a plataforma, confirme sua idade e aceite os termos abaixo.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Birth date */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
              DATA DE NASCIMENTO
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={getMaxBirthDate()}
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,168,67,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f1f5f9",
                fontSize: 14,
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Terms */}
          <label
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={termsConsent}
              onChange={(e) => setTermsConsent(e.target.checked)}
              style={{ marginTop: 2, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
              Li e aceito os{" "}
              <a href="/terms" target="_blank" style={{ color: GOLD, textDecoration: "none" }}>
                Termos de Uso
              </a>{" "}
              e confirmo que tenho 18 anos ou mais.
            </span>
          </label>

          {/* LGPD */}
          <label
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              style={{ marginTop: 2, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
              Concordo com a{" "}
              <a href="/privacy" target="_blank" style={{ color: GOLD, textDecoration: "none" }}>
                Política de Privacidade
              </a>{" "}
              e autorizo o tratamento dos meus dados conforme a LGPD.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p
              style={{
                color: "#f87171",
                fontSize: 13,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? "rgba(212,168,67,0.4)"
                : "linear-gradient(135deg, #d4a843 0%, #f5d78c 50%, #d4a843 100%)",
              border: "none",
              borderRadius: 8,
              padding: "13px 24px",
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            {loading ? "Salvando..." : "Continuar para a plataforma"}
          </button>
        </form>

        <p style={{ color: "#334155", fontSize: 11, margin: "20px 0 0", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center" }}>
          Acesso seguro · 18+
        </p>
      </div>
    </main>
  );
}
