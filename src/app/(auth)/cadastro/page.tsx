"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Existing auth error payloads are provider-specific. */

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { validateBirthDate } from "@/lib/age-validation";
import { supabaseAuth } from "@/lib/supabase-client";

type AccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
type Category = "MULHER" | "TRANS" | "HOMEM";
type Step = "form" | "verify" | "phone";
type BirthPart = "day" | "month" | "year";
type PendingAuthMethod = "google" | "sms" | null;
type AuthError = { code?: string; name?: string; message?: string };

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PROPERTY_DRAFT_KEY = "elitemodell_property_draft_v1";

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

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function asAuthError(err: unknown): AuthError {
  return typeof err === "object" && err !== null ? (err as AuthError) : {};
}

function composeBirthDate(parts: Record<BirthPart, string>) {
  if (parts.day.length !== 2 || parts.month.length !== 2 || parts.year.length !== 4) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

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

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.84 0 3.5.67 4.79 1.77l3.56-3.56A11.96 11.96 0 0012 .96C7.43.96 3.48 3.77 1.6 7.76l3.67 2z" />
    <path fill="#34A853" d="M16.04 18.02A7.06 7.06 0 0112 19.1c-2.96 0-5.49-1.82-6.64-4.44l-3.68 2.01C3.59 20.3 7.5 23.04 12 23.04c2.93 0 5.72-1.08 7.81-3.01l-3.77-2.01z" />
    <path fill="#4A90D9" d="M19.81 20.03A11.95 11.95 0 0023.04 12c0-.72-.07-1.47-.2-2.18H12v4.36h6.19a5.26 5.26 0 01-2.29 3.45l3.91 2.4z" />
    <path fill="#FBBC05" d="M5.36 14.66A7.17 7.17 0 014.9 12c0-.92.16-1.8.46-2.62L1.6 7.37A11.97 11.97 0 00.96 12c0 1.63.33 3.18.93 4.6l3.47-1.94z" />
  </svg>
);

const SmsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M12 18h.01" />
    <path d="M9 6h6" />
  </svg>
);

function AuthMethodButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 54,
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(212,168,67,0.24)",
        borderRadius: 8,
        color: "#cbd5e1",
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginBottom: 10,
        opacity: disabled ? 0.68 : 1,
        transition: "border-color 0.2s, background 0.2s, color 0.2s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)";
        e.currentTarget.style.background = "rgba(15,23,42,0.95)";
        e.currentTarget.style.color = "#f1f5f9";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "rgba(212,168,67,0.24)";
        e.currentTarget.style.background = "rgba(15,23,42,0.72)";
        e.currentTarget.style.color = "#cbd5e1";
      }}
    >
      <span style={{ width: 22, height: 22, display: "grid", placeItems: "center", color: "#d4a843" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function CadastroPage() {
  const router = useRouter();
  const { status } = useSession();
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
  const [birthParts, setBirthParts] = useState<Record<BirthPart, string>>({
    day: "",
    month: "",
    year: "",
  });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [pendingAuthMethod, setPendingAuthMethod] = useState<PendingAuthMethod>(null);
  const isAuthenticated = status === "authenticated";
  const isLoggedUpgradeFlow = isAuthenticated && form.accountType !== "GUEST";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draft = params.get("draft");
    const tipo = params.get("tipo");
    const hasRoomDraft = Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));

    window.setTimeout(() => {
      if (hasRoomDraft || draft === "quarto" || draft === "imovel") {
        setForm((current) => ({ ...current, accountType: "PROPERTY_HOST", category: "" }));
        return;
      }

      if (tipo === "profissional") {
        setForm((current) => ({ ...current, accountType: "PROFESSIONAL" }));
      }
    }, 0);
  }, []);

  const categories = [
    { value: "MULHER", label: "Mulher" },
    { value: "HOMEM", label: "Homem" },
    { value: "TRANS", label: "Trans" },
  ];
  const accountSubtitle =
    form.accountType === "PROFESSIONAL"
      ? "Cadastro profissional +18"
      : form.accountType === "PROPERTY_HOST"
        ? "Conta de anunciante +18"
        : "Cadastro seguro +18";
  const accountHint =
    form.accountType === "PROFESSIONAL"
      ? "Depois da conta, voce segue direto para as etapas do perfil profissional."
      : form.accountType === "PROPERTY_HOST"
        ? "Seu rascunho fica salvo. Depois da conta, voce volta para publicar o espaco."
        : "";

  function handleBirthPartChange(part: BirthPart, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const nextParts = { ...birthParts, [part]: onlyDigits(value, maxLength) };

    setBirthParts(nextParts);
    setForm({ ...form, birthDate: composeBirthDate(nextParts) });
  }

  function validateRequiredForm(includeEmailFields: boolean, showToast = false) {
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
    const isValid = Object.keys(newErrors).length === 0;

    if (!isValid && showToast) {
      toast.error("Complete os dados obrigatorios antes de continuar.");
      window.setTimeout(() => {
        document.querySelector("[data-auth-required-error='true']")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }

    return isValid;
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
    if (form.accountType === "PROPERTY_HOST") {
      return localStorage.getItem(PROPERTY_DRAFT_KEY) ? "/anfitriao/imoveis/novo?finalizar=1" : "/anfitriao";
    }
    return "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPendingAuthMethod(null);
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
    } catch (err: unknown) {
      const authError = asAuthError(err);
      const msg: Record<string, string> = {
        user_already_exists: "Este email ja esta cadastrado.",
        weak_password: "Senha fraca. Use no minimo 6 caracteres.",
        invalid_email: "Email invalido.",
      };
      toast.error(msg[authError.code ?? ""] ?? msg[authError.name ?? ""] ?? authError.message ?? "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setPendingAuthMethod("google");
    if (!validateRequiredForm(false, true)) return;

    setLoading(true);
    try {
      sessionStorage.setItem("elitemodell_pending_registration", JSON.stringify(registrationPayload()));
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(asAuthError(err).message ?? "Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueExistingAccount() {
    if (!isLoggedUpgradeFlow && !validateRequiredForm(false, true)) return;

    if (form.accountType === "PROFESSIONAL" && !form.category) {
      setErrors((current) => ({ ...current, category: "Selecione a categoria do anúncio" }));
      toast.error("Selecione a categoria do anúncio.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabaseAuth.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        sessionStorage.setItem("elitemodell_pending_registration", JSON.stringify(registrationPayload()));
        toast.error("Entre novamente para continuar seu cadastro.");
        router.push("/login");
        return;
      }

      await registerUser(accessToken);
      const res = await signIn("supabase", { accessToken, redirect: false });
      if (res?.error) throw new Error("Nao foi possivel atualizar sua sessao.");

      router.push(nextPath());
      router.refresh();
    } catch (err: unknown) {
      toast.error(asAuthError(err).message ?? "Nao foi possivel continuar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPendingAuthMethod("sms");
    if (!validateRequiredForm(false, true)) return;

    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signInWithOtp({
        phone: `+55${phone}`,
        options: { data: registrationPayload() },
      });
      if (error) throw error;
      toast.success("Código enviado!");
      setOtpSent(true);
    } catch (err: unknown) {
      toast.error(asAuthError(err).message ?? "Erro ao enviar SMS.");
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
    } catch (err: unknown) {
      toast.error(asAuthError(err).message ?? "Codigo invalido ou expirado.");
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
      <p style={{ color: "#475569", fontSize: 14, textAlign: "center", marginTop: -18, marginBottom: accountHint ? 8 : 24 }}>{accountSubtitle}</p>
      {accountHint && (
        <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", lineHeight: 1.5, margin: "0 0 22px" }}>{accountHint}</p>
      )}
      <div id="recaptcha-cadastro" />

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
          {errors.category && <p data-auth-required-error="true" style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors.category}</p>}
          <p style={{ color: "#334155", fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>
            Para publicar, sera obrigatorio enviar documento com foto, fotos reais e biometria facial. A idade exibida deve ser confirmada por documento.
          </p>
          <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(212,168,67,0.06)" }}>
            <p style={{ color: "#d4a843", fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", margin: "0 0 8px" }}>Fases do cadastro</p>
            <div style={{ display: "grid", gap: 6 }}>
              {["Dados do perfil", "Fotos e valores", "Documentos", "Biometria", "Analise da equipe"].map((item, index) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 999, border: "1px solid rgba(212,168,67,0.35)", color: "#f5d78c", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{index + 1}</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoggedUpgradeFlow ? (
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 8, border: "1px solid rgba(212,168,67,0.24)", background: "rgba(15,23,42,0.72)" }}>
          <p style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>
            Continuar como {form.accountType === "PROFESSIONAL" ? "profissional anunciante" : "anunciante de espaco"}
          </p>
          <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "0 0 12px" }}>
            Voce ja esta logado. Vamos atualizar sua conta e abrir as etapas do cadastro.
          </p>
          <button
            type="button"
            onClick={handleContinueExistingAccount}
            disabled={loading}
            style={{ width: "100%", padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Preparando cadastro..." : form.accountType === "PROFESSIONAL" ? "Ir para as fases do cadastro" : "Voltar ao anuncio"}
          </button>
        </div>
      ) : (
        <>
          <AuthMethodButton
            disabled={loading}
            icon={GoogleIcon}
            label="Cadastrar com Google"
            onClick={handleGoogle}
          />
          <AuthMethodButton
            disabled={loading}
            icon={SmsIcon}
            label="Cadastrar com SMS"
            onClick={() => {
              setPendingAuthMethod("sms");
              if (!validateRequiredForm(false, true)) return;
              setStep("phone");
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
            <span style={{ color: "#475569", fontSize: 13 }}>ou com email</span>
            <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
          </div>
        </>
      )}

      {!isLoggedUpgradeFlow && <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { key: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
          { key: "email", label: "Email", type: "email", placeholder: "seu@email.com" },
          { key: "password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>{field.label}</label>
            <input type={field.type} required placeholder={field.placeholder} value={(form as any)[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
            {errors[field.key] && <p data-auth-required-error="true" style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors[field.key]}</p>}
          </div>
        ))}

        <div>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Data de nascimento</label>
          <div style={{ display: "grid", gridTemplateColumns: "0.72fr 0.72fr 1fr", gap: 8 }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday-day"
              required
              maxLength={2}
              placeholder="DD"
              value={birthParts.day}
              onChange={(e) => handleBirthPartChange("day", e.target.value)}
              style={{ ...inputStyle, textAlign: "center" }}
              onFocus={focusGold}
              onBlur={blurGray}
              aria-label="Dia de nascimento"
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday-month"
              required
              maxLength={2}
              placeholder="MM"
              value={birthParts.month}
              onChange={(e) => handleBirthPartChange("month", e.target.value)}
              style={{ ...inputStyle, textAlign: "center" }}
              onFocus={focusGold}
              onBlur={blurGray}
              aria-label="Mes de nascimento"
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday-year"
              required
              maxLength={4}
              placeholder="AAAA"
              value={birthParts.year}
              onChange={(e) => handleBirthPartChange("year", e.target.value)}
              style={{ ...inputStyle, textAlign: "center" }}
              onFocus={focusGold}
              onBlur={blurGray}
              aria-label="Ano de nascimento"
            />
          </div>
          {errors.birthDate && <p data-auth-required-error="true" style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{errors.birthDate}</p>}
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={form.termsConsent} onChange={(e) => setForm({ ...form, termsConsent: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
          <span>
            Li e aceito os <Link href="/terms" style={{ color: GOLD, textDecoration: "none" }}>Termos de Uso</Link>.
            {errors.termsConsent && <span data-auth-required-error="true" style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.termsConsent}</span>}
          </span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={form.lgpdConsent} onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
          <span>
            Li e aceito a <Link href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>Política de Privacidade</Link>.
            {errors.lgpdConsent && <span data-auth-required-error="true" style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.lgpdConsent}</span>}
          </span>
        </label>

        {pendingAuthMethod === "google" && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              padding: "13px",
              background: "#f8fafc",
              color: "#0f172a",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {GoogleIcon}
            {loading ? "Abrindo Google..." : "Continuar com Google"}
          </button>
        )}

        {pendingAuthMethod === "sms" && (
          <button
            type="button"
            onClick={() => {
              if (!validateRequiredForm(false, true)) return;
              setStep("phone");
            }}
            disabled={loading}
            style={{
              padding: "13px",
              background: "rgba(212,168,67,0.12)",
              color: "#f5d78c",
              border: "1px solid rgba(212,168,67,0.32)",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {SmsIcon}
            Continuar com SMS
          </button>
        )}

        <button type="submit" disabled={loading} style={{ padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>}

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Já tem uma conta? <Link href="/login" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Entrar</Link>
      </p>
    </div>
  );
}
