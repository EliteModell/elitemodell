"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { supabaseAuth } from "@/lib/supabase-client";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

type SessionState = "checking" | "ready" | "invalid";

export function ResetPasswordClient() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setSessionState("invalid");
    }, 5000);

    supabaseAuth.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.access_token) {
        window.clearTimeout(timer);
        setSessionState("ready");
      }
    }).catch(() => {
      if (active) setSessionState("invalid");
    });

    const { data: subscription } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session?.access_token) {
        window.clearTimeout(timer);
        setSessionState("ready");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("Use no minimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.updateUser({ password });
      if (error) throw error;
      await supabaseAuth.auth.signOut().catch(() => undefined);
      await signOut({ redirect: false }).catch(() => undefined);
      toast.success("Senha atualizada. Entre novamente.");
      router.replace(`${ACCOUNT_ROUTES.login}?role=cliente`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel atualizar a senha.");
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

        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: "0 0 10px" }}>Criar nova senha</h1>

        {sessionState === "checking" ? (
          <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>Validando seu link de recuperacao...</p>
        ) : sessionState === "invalid" ? (
          <>
            <p style={{ color: "#fca5a5", lineHeight: 1.6, margin: "0 0 18px" }}>
              Link expirado, ja usado ou sem sessao valida. Solicite outro link de recuperacao.
            </p>
            <Link href="/esqueci-senha" style={{ display: "flex", minHeight: 54, borderRadius: 14, background: GOLD, color: "#070707", alignItems: "center", justifyContent: "center", textDecoration: "none", fontWeight: 950 }}>
              Solicitar novo link
            </Link>
          </>
        ) : (
          <>
            <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px" }}>
              Escolha uma senha nova para sua conta Elite Modell.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ color: GOLD, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nova senha</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 6 caracteres"
                  style={{ minHeight: 54, borderRadius: 14, border: "1px solid rgba(212,168,67,0.28)", background: "#0b0b0d", color: "#fff", padding: "13px 15px", fontSize: 15, outline: "none" }}
                />
              </label>

              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ color: GOLD, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Confirmar senha</span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Digite novamente"
                  style={{ minHeight: 54, borderRadius: 14, border: "1px solid rgba(212,168,67,0.28)", background: "#0b0b0d", color: "#fff", padding: "13px 15px", fontSize: 15, outline: "none" }}
                />
              </label>

              <button type="submit" disabled={loading} style={{ minHeight: 54, border: 0, borderRadius: 14, background: GOLD, color: "#070707", fontWeight: 950, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.68 : 1 }}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
