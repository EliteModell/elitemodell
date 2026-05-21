"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Existing auth error payloads are provider-specific. */

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES, postLoginPathFromUser } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const focusGold = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = GOLD);
const blurGray = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#1e293b");

const authMsg: Record<string, string> = {
  invalid_credentials: "Email ou senha inválidos.",
  user_not_found: "Email não cadastrado.",
  over_request_rate_limit: "Muitas tentativas. Tente mais tarde.",
};

function SocialButton({ onClick, icon, label }: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,67,0.2)")}
      style={{
        flex: 1,
        padding: "11px 8px",
        background: "transparent",
        border: "1px solid rgba(212,168,67,0.2)",
        borderRadius: 8,
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        transition: "border-color 0.2s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const GoogleIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.84 0 3.5.67 4.79 1.77l3.56-3.56A11.96 11.96 0 0012 .96C7.43.96 3.48 3.77 1.6 7.76l3.67 2z" />
    <path fill="#34A853" d="M16.04 18.02A7.06 7.06 0 0112 19.1c-2.96 0-5.49-1.82-6.64-4.44l-3.68 2.01C3.59 20.3 7.5 23.04 12 23.04c2.93 0 5.72-1.08 7.81-3.01l-3.77-2.01z" />
    <path fill="#4A90D9" d="M19.81 20.03A11.95 11.95 0 0023.04 12c0-.72-.07-1.47-.2-2.18H12v4.36h6.19a5.26 5.26 0 01-2.29 3.45l3.91 2.4z" />
    <path fill="#FBBC05" d="M5.36 14.66A7.17 7.17 0 014.9 12c0-.92.16-1.8.46-2.62L1.6 7.37A11.97 11.97 0 00.96 12c0 1.63.33 3.18.93 4.6l3.47-1.94z" />
  </svg>
);

async function appSignIn(accessToken: string) {
  return signIn("supabase", { accessToken, redirect: false });
}

function safeInternalPath(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
}

async function getPostLoginPath(returnUrl: string | null) {
  const safeReturnUrl = safeInternalPath(returnUrl);
  if (safeReturnUrl) return safeReturnUrl;
  if (localStorage.getItem(PROPERTY_DRAFT_KEY)) return PROPERTY_DRAFT_FINAL_PATH;

  const res = await fetch("/api/users/me");
  if (!res.ok) return ACCOUNT_ROUTES.mainClientFeed;
  const user = await res.json();
  return postLoginPathFromUser(user);
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? searchParams.get("redirectTo");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  function handleBack() {
    const safeReturnUrl = safeInternalPath(returnUrl);
    if (safeReturnUrl) {
      router.push(safeReturnUrl);
      return;
    }
    router.back();
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error || !data.session?.access_token) throw error ?? new Error("Email ou senha inválidos.");
      const res = await appSignIn(data.session.access_token);

      if (res?.error) {
        toast.error("Erro ao entrar. Tente novamente.");
      } else {
        toast.success("Bem-vindo de volta!");
        router.push(await getPostLoginPath(returnUrl));
        router.refresh();
      }
    } catch (err: any) {
      toast.error(authMsg[err?.code] ?? err?.message ?? "Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${
            returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""
          }`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: "100%",
      maxWidth: 420,
      background: "#0b1420",
      border: "1px solid rgba(212,168,67,0.28)",
      borderRadius: 16,
      padding: "40px 36px",
      position: "relative",
      zIndex: 1,
    }}>
      {/* Linha dourada no topo */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "16px 16px 0 0", background: "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)" }} />
      <button
        type="button"
        onClick={handleBack}
        aria-label="Voltar"
        style={{ position: "absolute", top: 16, left: 16, width: 38, height: 38, borderRadius: 8, border: "1px solid rgba(212,168,67,0.18)", background: "transparent", color: "#94a3b8", display: "grid", placeItems: "center", cursor: "pointer" }}
      >
        <ArrowLeft size={18} />
      </button>

      <div id="recaptcha-container" />

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-0.5px" }}>
            <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </Link>
        <p style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>Entre na sua conta</p>
      </div>

      {/* Social */}
      <div style={{ display: "flex", marginBottom: 20 }}>
        <SocialButton onClick={handleGoogle} icon={GoogleIcon} label="Entrar com Google" />
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
        <span style={{ color: "#475569", fontSize: 13 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
      </div>

      {/* Email */}
      <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Senha</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <Link href="/esqueci-senha" style={{ fontSize: 12, color: GOLD, textDecoration: "none" }}>Esqueci minha senha</Link>
            </div>
          </div>
          <button type="submit" disabled={loading}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e8bb47"; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = GOLD; }}
            style={{ padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", marginTop: 4 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Não tem uma conta?{" "}
        <Link href={ACCOUNT_ROUTES.cadastro} style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Cadastre-se</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
