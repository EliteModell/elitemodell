"use client";

import { useState } from "react";
import { validateBirthDate } from "@/lib/age-validation";

const GOLD = "#d4a843";
const GOLD_GRADIENT =
  "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

function maskBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function birthDateToIso(value: string): { iso: string | null; error: string | null } {
  if (!value) return { iso: null, error: "Informe sua data de nascimento." };
  if (value.length < 10) return { iso: null, error: "Informe a data completa no formato DD/MM/AAAA." };

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return { iso: null, error: "Data de nascimento inválida." };

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isRealDate) return { iso: null, error: "Data de nascimento inválida." };

  const iso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const validation = validateBirthDate(iso);
  if (!validation.isValid) return { iso: null, error: validation.errors[0] ?? "Data de nascimento inválida." };
  if (!validation.isOfAge) return { iso: null, error: "Você deve ter 18 anos ou mais para acessar a plataforma." };

  return { iso, error: null };
}

export default function CompletarCadastroPage() {
  const [birthDate, setBirthDate] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parsedBirthDate = birthDateToIso(birthDate);
  const canSubmit = Boolean(parsedBirthDate.iso && lgpdConsent && termsConsent && !loading);

  function handleBirthDateChange(value: string) {
    setBirthDate(maskBirthDate(value));
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = birthDateToIso(birthDate);
    if (parsed.error || !parsed.iso) {
      setError(parsed.error ?? "Data de nascimento inválida.");
      return;
    }

    if (!lgpdConsent || !termsConsent) {
      setError("Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: parsed.iso, lgpdConsent, termsConsent }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erro ao salvar dados.");
        return;
      }

      // Reload completo para garantir que o JWT seja refrescado com needsConsent = false
      window.location.replace("/dashboard");
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
              type="tel"
              inputMode="numeric"
              value={birthDate}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              onBlur={() => {
                const parsed = birthDateToIso(birthDate);
                if (birthDate && parsed.error) setError(parsed.error);
              }}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,168,67,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f1f5f9",
                fontSize: 14,
                outline: "none",
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
            disabled={!canSubmit}
            style={{
              background: !canSubmit
                ? "rgba(212,168,67,0.4)"
                : "linear-gradient(135deg, #d4a843 0%, #f5d78c 50%, #d4a843 100%)",
              border: "none",
              borderRadius: 8,
              padding: "13px 24px",
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 700,
              cursor: !canSubmit ? "not-allowed" : "pointer",
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
