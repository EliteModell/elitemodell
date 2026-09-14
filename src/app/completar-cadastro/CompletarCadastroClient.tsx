"use client";

import { useState } from "react";
import { validateBirthDate } from "@/lib/age-validation";
import { BrandMark } from "@/components/BrandMark";

const GOLD = "#CA4651";

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

export default function CompletarCadastroClient() {
  const [birthDate, setBirthDate] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parsedBirthDate = birthDateToIso(birthDate);
  const canSubmit = Boolean(parsedBirthDate.iso && lgpdConsent && termsConsent && ageConfirmed && !loading);

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

    if (!lgpdConsent || !termsConsent || !ageConfirmed) {
      setError("Confirme a maioridade e aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: parsed.iso, lgpdConsent, termsConsent, ageConfirmed }),
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
        background: "#f7f7fa",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e7e2ec",
          borderRadius: 16,
          padding: "40px 32px 36px",
          position: "relative",
          boxShadow: "0 20px 60px rgba(52,33,67,0.12)",
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
              "linear-gradient(90deg, transparent 0%, #CA4651 30%, #efabb1 50%, #CA4651 70%, transparent 100%)",
          }}
        />

        {/* Logo */}
        <div style={{ width: 176, margin: "0 auto 28px" }}>
          <BrandMark priority />
        </div>

        <h1
          style={{
            color: "#17141d",
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
            color: "#b9adbf",
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
            <label style={{ color: "#b9adbf", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
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
                background: "#fff",
                border: "1px solid #ded7e5",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#17141d",
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
            <span style={{ color: "#514b59", fontSize: 13, lineHeight: 1.5 }}>
              Li e aceito os{" "}
              <a href="/terms" target="_blank" style={{ color: GOLD, textDecoration: "none" }}>
                Termos de Uso
              </a>{" "}
              e li o{" "}
              <a href="/documentos/registration-short-notice" target="_blank" style={{ color: GOLD, textDecoration: "none" }}>
                Aviso Resumido de Cadastro
              </a>.
            </span>
          </label>

          {/* Age confirmation */}
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
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              style={{ marginTop: 2, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ color: "#514b59", fontSize: 13, lineHeight: 1.5 }}>
              Confirmo que sou maior de 18 anos e li a{" "}
              <a href="/documentos/adult-declaration" target="_blank" style={{ color: GOLD, textDecoration: "none" }}>
                Confirmação de Maioridade
              </a>.
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
            <span style={{ color: "#514b59", fontSize: 13, lineHeight: 1.5 }}>
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
                ? "rgba(202,70,81,0.4)"
                : "linear-gradient(135deg, #CA4651 0%, #df7b84 50%, #CA4651 100%)",
              border: "none",
              borderRadius: 8,
              padding: "13px 24px",
              color: "#fff",
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

        <p style={{ color: "#66566f", fontSize: 11, margin: "20px 0 0", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center" }}>
          Acesso seguro · 18+
        </p>
      </div>
    </main>
  );
}
