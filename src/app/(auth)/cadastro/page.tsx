"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { validateBirthDate } from "@/lib/age-validation";
import { supabaseAuth } from "@/lib/supabase-auth";

type AccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
type Category = "MULHER" | "TRANS" | "HOMEM";
type Step = "form" | "verify" | "phone";

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

const focusGold = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = GOLD;
};
const blurGray = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#1e293b";
};

const GoldLine = () => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "16px 16px 0 0", background: "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)" }} />
);

const Logo = () => (
  <div style={{ textAlign: "center", marginBottom: 28 }}>
    <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 2 }}>
      <span style={{ fontWeight: 900, fontSize: 26 }}>
        <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
        <span style={{ color: "#f1f5f9" }}>modell</span>
      </span>
    </Link>
  </div>
);

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    birthDate: "",
    accountType: "GUEST" as AccountType,
    category: "" as Category | "",
    lgpdConsent: false,
    termsConsent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const roles = [
    { value: "GUEST", label: "Cliente", desc: "Quero buscar acompanhantes verificadas ou reservar imoveis." },
    { value: "PROFESSIONAL", label: "Profissional anunciante", desc: "Quero anunciar meu perfil com documento, fotos e biometria." },
    { value: "PROPERTY_HOST", label: "Anfitriao de imovel", desc: "Quero cadastrar imoveis premium para reserva." },
  ];
  const categories = [
    { value: "MULHER", label: "Mulher" },
    { value: "HOMEM", label: "Homem" },
    { value: "TRANS", label: "Trans" },
  ];

  function validateRequiredForm(includeEmailFields: boolean) {
    const newErrors: Record<string, string> = {};

    if (includeEmailFields && !form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (includeEmailFields && !form.email.includes("@")) newErrors.email = "Email inválido";
    if (includeEmailFields && form.password.length < 6) newErrors.password = "Mínimo 6 caracteres";

    if (!form.birthDate) {
      newErrors.birthDate = "Data de nascimento é obrigatória";
    } else {
      const { isOfAge, errors: ageErrors } = validateBirthDate(form.birthDate);
      if (!isOfAge) newErrors.birthDate = ageErrors[0] || "Você deve ter 18 anos ou mais";
    }

    if (form.accountType === "PROFESSIONAL" && !form.category) newErrors.category = "Selecione a categoria do anúncio";
    if (!form.termsConsent) newErrors.termsConsent = "Você deve aceitar os Termos de Uso";
    if (!form.lgpdConsent) newErrors.lgpdConsent = "Você deve aceitar a Política de Privacidade";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function registrationPayload() {
    return {
      role: form.accountType === "GUEST" ? "GUEST" : "HOST",
      accountType: form.accountType,
      category: form.accountType === "PROFESSIONAL" ? form.category : undefined,
      birthDate: form.birthDate,
      lgpdConsent: form.lgpdConsent,
      termsConsent: form.termsConsent,
      name: form.name,
    };
  }

  async function registerUser(accessToken: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        ...registrationPayload(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "Erro ao criar conta.");
    }
  }

  function nextPath() {
    if (form.accountType === "PROFESSIONAL") return "/profissional/novo";
    if (form.accountType === "PROPERTY_HOST") return "/anfitriao";
    return "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRequiredForm(true)) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: registrationPayload(),
        },
      });
      if (error) throw error;
      if (data.session?.access_token) {
        await registerUser(data.session.access_token);
        const res = await signIn("supabase", { accessToken: data.session.access_token, redirect: false });
        if (res?.ok) {
          router.push(nextPath());
          router.refresh();
          return;
        }
      }
      sessionStorage.setItem("elitemodell_pending_registration", JSON.stringify(registrationPayload()));
      setStep("verify");
    } catch (err: any) {
      const msg: Record<string, string> = {
        user_already_exists: "Este email ja esta cadastrado.",
        weak_password: "Senha fraca. Use no minimo 6 caracteres.",
        invalid_email: "Email invalido.",
      };
      toast.error(msg[err?.code] ?? msg[err?.name] ?? err?.message ?? "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!validateRequiredForm(false)) return;

    setLoading(true);
    try {
      sessionStorage.setItem("elitemodell_pending_registration", JSON.stringify(registrationPayload()));
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRequiredForm(false)) return;

    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signInWithOtp({
        phone: `+55${phone}`,
        options: { data: registrationPayload() },
      });
      if (error) throw error;
      toast.success("Código enviado!");
      setOtpSent(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar SMS.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        phone: `+55${phone}`,
        token: otp,
        type: "sms",
      });
      if (error || !data.session?.access_token) throw error ?? new Error("Codigo invalido.");
      await registerUser(data.session.access_token);
      const res = await signIn("supabase", { accessToken: data.session.access_token, redirect: false });
      if (res?.ok) {
        router.push(nextPath());
        router.refresh();
      } else {
        toast.error("Erro ao autenticar.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <div style={{ width: "100%", maxWidth: 420, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "40px 36px", position: "relative", zIndex: 1 }}>
        <GoldLine />
        <div id="recaptcha-cadastro" />
        <Logo />
        <p style={{ color: "#475569", fontSize: 14, textAlign: "center", marginTop: -16, marginBottom: 28 }}>Cadastro via SMS</p>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Número de celular</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, pointerEvents: "none" }}>BR +55</span>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="11 99999-9999" style={{ ...inputStyle, paddingLeft: 80 }} onFocus={focusGold} onBlur={blurGray} />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.length < 10} style={{ padding: "13px", background: phone.length < 10 ? "rgba(212,168,67,0.3)" : GOLD, color: phone.length < 10 ? "#475569" : "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
            <button type="button" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: GOLD, fontSize: 13, cursor: "pointer", textAlign: "center" }}>Voltar</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhone} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", margin: 0 }}>Código enviado para <strong style={{ color: "#94a3b8" }}>+55 {phone}</strong></p>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Código de 6 dígitos</label>
              <input type="text" inputMode="numeric" required autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700 }} onFocus={focusGold} onBlur={blurGray} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} style={{ padding: "13px", background: otp.length < 6 ? "rgba(212,168,67,0.3)" : GOLD, color: otp.length < 6 ? "#475569" : "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              {loading ? "Verificando..." : "Verificar e entrar"}
            </button>
            <button type="button" onClick={() => setOtpSent(false)} style={{ background: "none", border: "none", color: GOLD, fontSize: 13, cursor: "pointer", textAlign: "center" }}>Usar outro número</button>
          </form>
        )}
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div style={{ width: "100%", maxWidth: 420, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "48px 36px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <GoldLine />
        <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>Verifique seu email</h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>Enviamos um link de confirmação para</p>
        <p style={{ color: GOLD, fontSize: 15, fontWeight: 600, margin: "0 0 24px" }}>{form.email}</p>
        <p style={{ color: "#334155", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>Clique no link do email para ativar sua conta. Depois volte aqui para entrar.</p>
        <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 460, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "40px 36px", position: "relative", zIndex: 1 }}>
      <GoldLine />
      <Logo />
      <p style={{ color: "#475569", fontSize: 14, textAlign: "center", marginTop: -18, marginBottom: 24 }}>Cadastro seguro +18</p>
      <div id="recaptcha-cadastro" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 18 }}>
        {roles.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setForm({ ...form, accountType: r.value as AccountType, category: r.value === "PROFESSIONAL" ? form.category : "" })}
            style={{
              padding: "13px 14px",
              background: form.accountType === r.value ? "rgba(212,168,67,0.08)" : "#0f172a",
              border: `1.5px solid ${form.accountType === r.value ? "rgba(212,168,67,0.5)" : "#1e293b"}`,
              borderRadius: 8,
              color: form.accountType === r.value ? "#f1f5f9" : "#475569",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 11, lineHeight: 1.4, color: form.accountType === r.value ? "#94a3b8" : "#334155" }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {form.accountType === "PROFESSIONAL" && (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>Categoria do anúncio</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, category: c.value as Category })}
                style={{
                  padding: "11px 8px",
                  background: form.category === c.value ? "rgba(212,168,67,0.08)" : "#0f172a",
                  border: `1.5px solid ${form.category === c.value ? "rgba(212,168,67,0.5)" : "#1e293b"}`,
                  borderRadius: 8,
                  color: form.category === c.value ? "#f1f5f9" : "#475569",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.category && <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors.category}</p>}
          <p style={{ color: "#334155", fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>
            Para publicar, sera obrigatorio enviar documento com foto, fotos reais e biometria facial. A idade exibida deve ser confirmada por documento.
          </p>
        </div>
      )}

      <button type="button" onClick={handleGoogle} disabled={loading} style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 8, color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>
        Cadastrar com Google
      </button>
      <button type="button" onClick={() => setStep("phone")} disabled={loading} style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 8, color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20 }}>
        Cadastrar com SMS
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
        <span style={{ color: "#475569", fontSize: 13 }}>ou com email</span>
        <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { key: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
          { key: "email", label: "Email", type: "email", placeholder: "seu@email.com" },
          { key: "password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>{field.label}</label>
            <input type={field.type} required placeholder={field.placeholder} value={(form as any)[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
            {errors[field.key] && <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors[field.key]}</p>}
          </div>
        ))}

        <div>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Data de nascimento</label>
          <input type="date" required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
          {errors.birthDate && <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors.birthDate}</p>}
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={form.termsConsent} onChange={(e) => setForm({ ...form, termsConsent: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
          <span>
            Li e aceito os <Link href="/terms" style={{ color: GOLD, textDecoration: "none" }}>Termos de Uso</Link>.
            {errors.termsConsent && <span style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.termsConsent}</span>}
          </span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={form.lgpdConsent} onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
          <span>
            Li e aceito a <Link href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>Política de Privacidade</Link>.
            {errors.lgpdConsent && <span style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.lgpdConsent}</span>}
          </span>
        </label>

        <button type="submit" disabled={loading} style={{ padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Já tem uma conta? <Link href="/login" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Entrar</Link>
      </p>
    </div>
  );
}
