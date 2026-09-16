"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { supabaseAuth } from "@/lib/supabase-client";
import { BrandMark } from "@/components/BrandMark";

const GOLD = "#CA4651";

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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f7fa", color: "#141212", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 430, background: "#fff", border: "1px solid #fff7f8", borderRadius: 20, padding: 30, boxShadow: "0 24px 70px rgba(37, 31, 32,0.12)" }}>
        <Link href="/" aria-label="Elite Modell" style={{ display: "inline-flex", width: 176, alignItems: "center", textDecoration: "none", marginBottom: 24 }}>
          <BrandMark priority />
        </Link>

        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: "0 0 10px" }}>Criar nova senha</h1>

        {sessionState === "checking" ? (
          <p style={{ color: "#b4adb0", lineHeight: 1.6, margin: 0 }}>Validando seu link de recuperacao...</p>
        ) : sessionState === "invalid" ? (
          <>
            <p style={{ color: "#fca5a5", lineHeight: 1.6, margin: "0 0 18px" }}>
              Link expirado, ja usado ou sem sessao valida. Solicite outro link de recuperacao.
            </p>
            <Link href="/esqueci-senha" style={{ display: "flex", minHeight: 54, borderRadius: 14, background: GOLD, color: "#fff", alignItems: "center", justifyContent: "center", textDecoration: "none", fontWeight: 950 }}>
              Solicitar novo link
            </Link>
          </>
        ) : (
          <>
            <p style={{ color: "#b4adb0", lineHeight: 1.6, margin: "0 0 24px" }}>
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
                  style={{ minHeight: 54, borderRadius: 14, border: "1px solid #f2c8cc", background: "#fff", color: "#141212", padding: "13px 15px", fontSize: 15, outline: "none" }}
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
                  style={{ minHeight: 54, borderRadius: 14, border: "1px solid #f2c8cc", background: "#fff", color: "#141212", padding: "13px 15px", fontSize: 15, outline: "none" }}
                />
              </label>

              <button type="submit" disabled={loading} style={{ minHeight: 54, border: 0, borderRadius: 14, background: GOLD, color: "#fff", fontWeight: 950, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.68 : 1 }}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
