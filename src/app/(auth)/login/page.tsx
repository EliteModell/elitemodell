"use client";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import type { ConfirmationResult, RecaptchaVerifier as RV } from "firebase/auth";

type Tab = "email" | "phone";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

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

const firebaseMsg: Record<string, string> = {
  "auth/invalid-credential": "Email ou senha inválidos.",
  "auth/user-not-found": "Email não cadastrado.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/too-many-requests": "Muitas tentativas. Tente mais tarde.",
  "auth/invalid-phone-number": "Número de telefone inválido.",
  "auth/invalid-verification-code": "Código inválido.",
  "auth/code-expired": "Código expirado. Solicite um novo.",
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

const AppleIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#f1f5f9">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

async function firebaseSignIn(idToken: string) {
  return signIn("firebase", { idToken, redirect: false });
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("email");
  const [otpSent, setOtpSent] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const recaptchaRef = useRef<RV | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { firebaseAuth } = await import("@/lib/firebase");

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        form.email,
        form.password
      );

      if (!credential.user.emailVerified) {
        await firebaseAuth.signOut();
        toast.error("Verifique seu email antes de entrar. Cheque sua caixa de entrada.");
        return;
      }

      const idToken = await credential.user.getIdToken();
      const res = await firebaseSignIn(idToken);

      if (res?.error) {
        toast.error("Erro ao entrar. Tente novamente.");
      } else {
        toast.success("Bem-vindo de volta!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(firebaseMsg[err?.code] ?? "Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const { firebaseAuth } = await import("@/lib/firebase");

      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const res = await firebaseSignIn(idToken);

      if (res?.error) {
        toast.error("Erro ao entrar com Google.");
      } else {
        toast.success("Bem-vindo!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        toast.error("Erro ao entrar com Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
      const { firebaseAuth } = await import("@/lib/firebase");

      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" }
        );
      }

      confirmationRef.current = await signInWithPhoneNumber(
        firebaseAuth,
        `+55${phone}`,
        recaptchaRef.current
      );

      toast.success("Código enviado por SMS!");
      setOtpSent(true);
    } catch (err: any) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(firebaseMsg[err?.code] ?? "Erro ao enviar SMS.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      const res = await firebaseSignIn(idToken);

      if (res?.error) {
        toast.error("Erro ao autenticar. Tente novamente.");
      } else {
        toast.success("Bem-vindo!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(firebaseMsg[err?.code] ?? "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setOtpSent(false);
    setOtp("");
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
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <SocialButton onClick={handleGoogle} icon={GoogleIcon} label="Google" />
        <SocialButton
          onClick={() => toast("Apple Sign In em breve.", { icon: "🍎" })}
          icon={AppleIcon}
          label="Apple"
        />
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
        <span style={{ color: "#475569", fontSize: 13 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#060e1b", borderRadius: 8, padding: 4 }}>
        {(["email", "phone"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => switchTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
            background: tab === t ? "#0f172a" : "transparent",
            color: tab === t ? GOLD : "#475569",
            transition: "all 0.2s",
          }}>
            {t === "email" ? "Email" : "Telefone"}
          </button>
        ))}
      </div>

      {/* Email */}
      {tab === "email" && (
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
      )}

      {/* Phone step 1 */}
      {tab === "phone" && !otpSent && (
        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Número de celular</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, pointerEvents: "none", userSelect: "none" }}>🇧🇷 +55</span>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="11 99999-9999" style={{ ...inputStyle, paddingLeft: 80 }} onFocus={focusGold} onBlur={blurGray} />
            </div>
          </div>
          <button type="submit" disabled={loading || phone.length < 10} style={{ padding: "13px", background: loading || phone.length < 10 ? "rgba(212,168,67,0.3)" : GOLD, color: loading || phone.length < 10 ? "#475569" : "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading || phone.length < 10 ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </form>
      )}

      {/* Phone step 2 */}
      {tab === "phone" && otpSent && (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", margin: 0 }}>
            Código enviado para <strong style={{ color: "#94a3b8" }}>+55 {phone}</strong>
          </p>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Código de 6 dígitos</label>
            <input type="text" inputMode="numeric" required autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700 }} onFocus={focusGold} onBlur={blurGray} />
          </div>
          <button type="submit" disabled={loading || otp.length < 6} style={{ padding: "13px", background: loading || otp.length < 6 ? "rgba(212,168,67,0.3)" : GOLD, color: loading || otp.length < 6 ? "#475569" : "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading || otp.length < 6 ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
            {loading ? "Verificando..." : "Verificar código"}
          </button>
          <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} style={{ background: "none", border: "none", color: GOLD, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
            ← Usar outro número
          </button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Não tem uma conta?{" "}
        <Link href="/cadastro" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Cadastre-se</Link>
      </p>
    </div>
  );
}
