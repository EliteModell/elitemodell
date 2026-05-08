"use client";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import type { ConfirmationResult, RecaptchaVerifier as RV } from "firebase/auth";

type Role = "GUEST" | "HOST";
type Step = "form" | "verify" | "phone";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#0d0d0d",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const focusRed = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#cc0000");
const blurGray = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#2a2a2a");

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "GUEST" as Role });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const recaptchaRef = useRef<RV | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } =
        await import("firebase/auth");
      const { firebaseAuth } = await import("@/lib/firebase");

      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        form.email,
        form.password
      );

      await updateProfile(credential.user, { displayName: form.name });

      const idToken = await credential.user.getIdToken();

      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: form.role }),
      });

      await sendEmailVerification(credential.user);
      await firebaseAuth.signOut();

      setStep("verify");
    } catch (err: any) {
      const msg: Record<string, string> = {
        "auth/email-already-in-use": "Este email já está cadastrado.",
        "auth/weak-password": "Senha fraca. Use no mínimo 6 caracteres.",
        "auth/invalid-email": "Email inválido.",
      };
      toast.error(msg[err?.code] ?? "Erro ao criar conta.");
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
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: form.role }),
      });
      const res = await signIn("firebase", { idToken, redirect: false });
      if (res?.ok) { router.push("/dashboard"); router.refresh(); }
      else toast.error("Erro ao entrar com Google.");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") toast.error("Erro ao entrar com Google.");
    } finally { setLoading(false); }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
      const { firebaseAuth } = await import("@/lib/firebase");
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-cadastro", { size: "invisible" });
      }
      confirmationRef.current = await signInWithPhoneNumber(firebaseAuth, `+55${phone}`, recaptchaRef.current);
      toast.success("Código enviado!");
      setOtpSent(true);
    } catch (err: any) {
      recaptchaRef.current?.clear(); recaptchaRef.current = null;
      toast.error("Erro ao enviar SMS.");
    } finally { setLoading(false); }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: form.role }),
      });
      const res = await signIn("firebase", { idToken, redirect: false });
      if (res?.ok) { router.push("/dashboard"); router.refresh(); }
      else toast.error("Erro ao autenticar.");
    } catch { toast.error("Código inválido ou expirado."); }
    finally { setLoading(false); }
  }

  const roles = [
    { value: "GUEST", label: "👤 Cliente", desc: "Quero encontrar e contratar acompanhantes" },
    { value: "HOST", label: "💋 Acompanhante", desc: "Quero me cadastrar e oferecer meus serviços" },
  ];

  if (step === "phone") {
    return (
      <div style={{ width: "100%", maxWidth: 420, background: "#111", border: "1px solid #222", borderRadius: 16, padding: "40px 36px", position: "relative", zIndex: 1 }}>
        <div id="recaptcha-cadastro" />
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800, fontSize: 26, color: "#fff" }}>elite<span style={{ color: "#cc0000" }}>modell</span></span>
          </Link>
          <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>Cadastro via SMS</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>Número de celular</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14, pointerEvents: "none" }}>🇧🇷 +55</span>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="11 99999-9999"
                  style={{ ...inputStyle, paddingLeft: 80 }}
                  onFocus={(e) => (e.target.style.borderColor = "#cc0000")}
                  onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.length < 10} style={{ padding: "13px", background: phone.length < 10 ? "#5a0000" : "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
            <button type="button" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "#cc0000", fontSize: 13, cursor: "pointer", textAlign: "center" }}>← Voltar</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhone} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#888", fontSize: 13, textAlign: "center", margin: 0 }}>Código enviado para <strong style={{ color: "#ccc" }}>+55 {phone}</strong></p>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>Código de 6 dígitos</label>
              <input type="text" inputMode="numeric" required autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700 }}
                onFocus={(e) => (e.target.style.borderColor = "#cc0000")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} style={{ padding: "13px", background: otp.length < 6 ? "#5a0000" : "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Verificando..." : "Verificar e entrar"}
            </button>
            <button type="button" onClick={() => setOtpSent(false)} style={{ background: "none", border: "none", color: "#cc0000", fontSize: 13, cursor: "pointer", textAlign: "center" }}>← Usar outro número</button>
          </form>
        )}
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div style={{ width: "100%", maxWidth: 420, background: "#111", border: "1px solid #222", borderRadius: 16, padding: "48px 36px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>📧</div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>
          Verifique seu email
        </h2>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>
          Enviamos um link de confirmação para
        </p>
        <p style={{ color: "#cc0000", fontSize: 15, fontWeight: 600, margin: "0 0 24px" }}>
          {form.email}
        </p>
        <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
          Clique no link do email para ativar sua conta. Depois volte aqui para entrar.
        </p>
        <button
          onClick={() => router.push("/login")}
          style={{ width: "100%", padding: "13px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Ir para o login
        </button>
        <p style={{ color: "#555", fontSize: 12, marginTop: 16 }}>
          Não recebeu? Verifique a pasta de spam.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 460, background: "#111", border: "1px solid #222", borderRadius: 16, padding: "40px 36px", position: "relative", zIndex: 1 }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontWeight: 800, fontSize: 26, color: "#fff" }}>
            elite<span style={{ color: "#cc0000" }}>modell</span>
          </span>
        </Link>
        <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>Plataforma adulta — +18</p>
      </div>

      <div id="recaptcha-cadastro" />

      {/* Google */}
      <button type="button" onClick={handleGoogle} disabled={loading}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
        style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: "#ccc", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, transition: "border-color 0.2s" }}>
        <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.84 0 3.5.67 4.79 1.77l3.56-3.56A11.96 11.96 0 0012 .96C7.43.96 3.48 3.77 1.6 7.76l3.67 2z"/><path fill="#34A853" d="M16.04 18.02A7.06 7.06 0 0112 19.1c-2.96 0-5.49-1.82-6.64-4.44l-3.68 2.01C3.59 20.3 7.5 23.04 12 23.04c2.93 0 5.72-1.08 7.81-3.01l-3.77-2.01z"/><path fill="#4A90D9" d="M19.81 20.03A11.95 11.95 0 0023.04 12c0-.72-.07-1.47-.2-2.18H12v4.36h6.19a5.26 5.26 0 01-2.29 3.45l3.91 2.4z"/><path fill="#FBBC05" d="M5.36 14.66A7.17 7.17 0 014.9 12c0-.92.16-1.8.46-2.62L1.6 7.37A11.97 11.97 0 00.96 12c0 1.63.33 3.18.93 4.6l3.47-1.94z"/></svg>
        Cadastrar com Google
      </button>

      <button type="button" onClick={() => setStep("phone")}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
        style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: "#ccc", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, transition: "border-color 0.2s" }}>
        Cadastrar com SMS
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
        <span style={{ color: "#555", fontSize: 13 }}>ou com email</span>
        <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
      </div>

      {/* Role selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {roles.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setForm({ ...form, role: r.value as Role })}
            style={{
              padding: "12px 10px",
              background: form.role === r.value ? "rgba(204,0,0,0.1)" : "#0d0d0d",
              border: `1.5px solid ${form.role === r.value ? "#cc0000" : "#222"}`,
              borderRadius: 8,
              color: form.role === r.value ? "#fff" : "#777",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 11, lineHeight: 1.4, color: form.role === r.value ? "#aaa" : "#555" }}>{r.desc}</div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { key: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
          { key: "email", label: "Email", type: "email", placeholder: "seu@email.com" },
          { key: "password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>
              {field.label}
            </label>
            <input
              type={field.type}
              required
              placeholder={field.placeholder}
              value={(form as any)[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              style={inputStyle}
              onFocus={focusRed}
              onBlur={blurGray}
            />
          </div>
        ))}

        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginTop: 4 }}>
          Ao criar uma conta você concorda com nossos{" "}
          <Link href="/termos" style={{ color: "#cc0000", textDecoration: "none" }}>Termos de Uso</Link>{" "}
          e{" "}
          <Link href="/privacidade" style={{ color: "#cc0000", textDecoration: "none" }}>Política de Privacidade</Link>.
        </p>

        <button
          type="submit"
          disabled={loading}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
          style={{ padding: "13px", background: loading ? "#8a0000" : "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", marginTop: 4 }}
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#666" }}>
        Já tem uma conta?{" "}
        <Link href="/login" style={{ color: "#cc0000", textDecoration: "none", fontWeight: 600 }}>Entrar</Link>
      </p>
    </div>
  );
}
