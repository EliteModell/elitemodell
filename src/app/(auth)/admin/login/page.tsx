"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnUrl=/admin`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com Google.");
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#050506",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "#0d0d10",
        border: "1px solid rgba(212,168,67,0.22)",
        borderRadius: 12,
        padding: "40px 32px 36px",
        position: "relative",
      }}>
        {/* Linha dourada no topo */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 2,
          borderRadius: "12px 12px 0 0",
          background: "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)",
        }} />

        {/* Badge */}
        <p style={{
          color: "#d4a843",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          margin: "0 0 16px",
        }}>
          Painel Administrativo
        </p>

        {/* Título */}
        <h1 style={{
          color: "#f1f5f9",
          fontSize: 24,
          fontWeight: 800,
          margin: "0 0 8px",
          lineHeight: 1.2,
        }}>
          Acesso Restrito
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
          margin: "0 0 32px",
          lineHeight: 1.5,
        }}>
          Apenas contas autorizadas têm acesso a este painel.
        </p>

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "13px 20px",
            background: loading ? "rgba(212,168,67,0.3)" : "#d4a843",
            border: "none",
            borderRadius: 8,
            color: "#0a0a0a",
            fontSize: 14,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: 0.3,
            transition: "opacity 0.2s",
          }}
        >
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? "Redirecionando..." : "Entrar com Google"}
        </button>

        {/* Erro */}
        {error && (
          <p style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 8,
            color: "#f87171",
            fontSize: 13,
            margin: "16px 0 0",
          }}>
            {error}
          </p>
        )}

        {/* Rodapé */}
        <p style={{
          color: "#1e293b",
          fontSize: 11,
          margin: "24px 0 0",
          textAlign: "center",
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}>
          Elite Modell · Acesso seguro
        </p>
      </div>
    </main>
  );
}
