"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Existing auth error payloads are provider-specific. */

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { validateBirthDate } from "@/lib/age-validation";
import { supabaseAuth } from "@/lib/supabase-client";
import {
  ACCOUNT_ROUTES,
  type CadastroTipo,
  internalAccountTypeFromTipo,
  normalizeCadastroTipo,
} from "@/lib/account-routes";

type AccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
type Category = "MULHER" | "TRANS" | "HOMEM";
type Step = "form" | "verify";
type BirthPart = "day" | "month" | "year";
type PendingAuthMethod = "google" | null;
type AuthError = { code?: string; name?: string; message?: string };

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PROPERTY_DRAFT_KEY = "elitemodell_property_draft_v1";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#111",
  border: "1px solid rgba(212,168,67,0.16)",
  borderRadius: 8,
  color: "#f4f1ea",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const focusGold = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = GOLD;
};
const blurGray = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(212,168,67,0.16)";
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
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
        height: 56,
        background: "#f8fafc",
        border: "1px solid rgba(255,255,255,0.86)",
        borderRadius: 8,
        color: "#0f172a",
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginBottom: 18,
        opacity: disabled ? 0.68 : 1,
        boxShadow: "0 16px 38px rgba(0,0,0,0.26)",
        transition: "border-color 0.2s, background 0.2s, color 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)";
        e.currentTarget.style.background = "#fff7df";
        e.currentTarget.style.color = "#060e1b";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.86)";
        e.currentTarget.style.background = "#f8fafc";
        e.currentTarget.style.color = "#0f172a";
        e.currentTarget.style.transform = "translateY(0)";
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
  const [hydrated, setHydrated] = useState(false);
  const [accountTypeSelected, setAccountTypeSelected] = useState(false);
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
  const [pendingAuthMethod, setPendingAuthMethod] = useState<PendingAuthMethod>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const isAuthenticated = status === "authenticated";
  const isLoggedUpgradeFlow = isAuthenticated && form.accountType !== "GUEST";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draft = params.get("draft");
    const tipo = normalizeCadastroTipo(params.get("tipo"));
    const hasRoomDraft = Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));

    window.setTimeout(() => {
      setHydrated(true);
      if (hasRoomDraft || draft === "quarto" || draft === "imovel") {
        setForm((current) => ({ ...current, accountType: "PROPERTY_HOST", category: "" }));
        setAccountTypeSelected(true);
        return;
      }

      if (tipo === "anfitriao") {
        router.replace(ACCOUNT_ROUTES.onboardingAnfitriao);
        return;
      }

      if (tipo) {
        setForm((current) => ({
          ...current,
          accountType: internalAccountTypeFromTipo(tipo),
          category: tipo === "acompanhante" ? current.category : "",
        }));
        setAccountTypeSelected(true);
        return;
      }

      setAccountTypeSelected(false);
    }, 0);
  }, [router]);

  useEffect(() => {
    if (hydrated && status === "authenticated" && accountTypeSelected && form.accountType === "GUEST") {
      router.replace(ACCOUNT_ROUTES.painelCliente);
    }
  }, [accountTypeSelected, form.accountType, hydrated, router, status]);

  function selectAccountType(tipo: CadastroTipo) {
    const accountType = internalAccountTypeFromTipo(tipo);
    setForm((current) => ({
      ...current,
      accountType,
      category: tipo === "acompanhante" ? current.category : "",
    }));
    setAccountTypeSelected(true);
    window.history.replaceState(null, "", `${ACCOUNT_ROUTES.cadastro}?tipo=${tipo}`);
  }

  const categories = [
    { value: "MULHER", label: "Mulher" },
    { value: "HOMEM", label: "Homem" },
    { value: "TRANS", label: "Trans" },
  ];
  const accountSubtitle =
    form.accountType === "PROFESSIONAL"
      ? "Ativação profissional +18"
      : form.accountType === "PROPERTY_HOST"
        ? "Cadastro de imóvel +18"
        : "Conta cliente +18";
  const accountHint =
    form.accountType === "PROFESSIONAL"
      ? "Depois da conta, você segue para a verificação e criação do perfil de anunciante."
      : form.accountType === "PROPERTY_HOST"
        ? "Seu rascunho fica salvo. Depois da conta, você volta para publicar o imóvel."
        : "";

  function handleBirthPartChange(part: BirthPart, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const cleaned = onlyDigits(value, maxLength);
    const nextParts = { ...birthParts, [part]: cleaned };

    setBirthParts(nextParts);
    setForm({ ...form, birthDate: composeBirthDate(nextParts) });

    if (part === "day" && cleaned.length === 2) monthRef.current?.focus();
    if (part === "month" && cleaned.length === 2) yearRef.current?.focus();
  }

  function validateRequiredForm(includeEmailFields: boolean, showToast = false) {
    const newErrors: Record<string, string> = {};

    if (includeEmailFields && !form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (includeEmailFields && !isValidEmail(form.email)) newErrors.email = "Email inválido";
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
      toast.error("Complete os dados obrigatórios antes de continuar.");
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
    if (form.accountType === "PROFESSIONAL") return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (form.accountType === "PROPERTY_HOST") {
      return ACCOUNT_ROUTES.onboardingAnfitriao;
    }
    return ACCOUNT_ROUTES.painelCliente;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPendingAuthMethod(null);
    if (!validateRequiredForm(true)) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.auth.signUp({
        email: form.email.trim().toLowerCase(),
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
        user_already_exists: "Este email já está cadastrado.",
        weak_password: "Senha fraca. Use no mínimo 6 caracteres.",
        invalid_email: "Email inválido.",
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
    if (!validateRequiredForm(false, true)) return;

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
        router.push(ACCOUNT_ROUTES.login);
        return;
      }

      await registerUser(accessToken);
      const res = await signIn("supabase", { accessToken, redirect: false });
      if (res?.error) throw new Error("Não foi possível atualizar sua sessão.");

      router.push(nextPath());
      router.refresh();
    } catch (err: unknown) {
      toast.error(asAuthError(err).message ?? "Não foi possível continuar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  if (hydrated && !accountTypeSelected) {
    const options: Array<{
      tipo: CadastroTipo;
      title: string;
      eyebrow: string;
      desc: string;
      action: string;
      directHref?: string;
    }> = [
      {
        tipo: "cliente",
        eyebrow: "Área do cliente",
        title: "Criar conta cliente",
        desc: "Busque perfis, salve favoritos, converse e reserve locais com uma conta discreta.",
        action: "Criar conta cliente",
      },
      {
        tipo: "acompanhante",
        eyebrow: "Perfil profissional",
        title: "Quero anunciar como acompanhante",
        desc: "Inicie a ativação profissional com maioridade, termos, documentos, fotos e análise da equipe.",
        action: "Ativar perfil profissional",
      },
      {
        tipo: "anfitriao",
        eyebrow: "Imóvel reservado",
        title: "Cadastrar meu imóvel",
        desc: "Cadastre um ambiente discreto primeiro. A conta entra no final e a publicação passa por aprovação.",
        action: "Começar cadastro do imóvel",
        directHref: ACCOUNT_ROUTES.onboardingAnfitriao,
      },
    ];

    return (
      <div style={{ width: "100%", maxWidth: 620, background: "rgba(8,8,8,0.96)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "34px 28px", position: "relative", zIndex: 1 }}>
        <GoldLine />
        <Logo />
        <div style={{ textAlign: "center", margin: "-12px 0 24px" }}>
          <p style={{ color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase", margin: "0 0 8px" }}>Cadastro Elite Modell</p>
          <h1 style={{ color: "#f4f1ea", fontSize: 24, lineHeight: 1.15, margin: 0 }}>Escolha o tipo de conta</h1>
          <p style={{ color: "#8d8578", fontSize: 13, lineHeight: 1.55, margin: "10px auto 0", maxWidth: 460 }}>
            Uma conta única pode acessar a área cliente e solicitar ativação como acompanhante ou anfitrião, sempre com aprovação.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {options.map((option) => {
            const content = (
              <>
                <span style={{ color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: 1.7, textTransform: "uppercase" }}>{option.eyebrow}</span>
                <strong style={{ display: "block", color: "#f8fafc", fontSize: 18, marginTop: 6 }}>{option.title}</strong>
                <p style={{ color: "#8d8578", fontSize: 12.5, lineHeight: 1.55, margin: "8px 0 14px" }}>{option.desc}</p>
                <span style={{ color: "#050505", background: GOLD, borderRadius: 999, display: "inline-flex", padding: "8px 13px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0 }}>
                  {option.action}
                </span>
              </>
            );

            if (option.directHref) {
              return (
                <Link
                  key={option.tipo}
                  href={option.directHref}
                  style={{ display: "block", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 12, background: "#111", padding: 18, textDecoration: "none" }}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={option.tipo}
                type="button"
                onClick={() => selectAccountType(option.tipo)}
                style={{ width: "100%", textAlign: "left", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 12, background: "#111", padding: 18, cursor: "pointer" }}
              >
                {content}
              </button>
            );
          })}
        </div>

        <p style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "#475569" }}>
          Já tem uma conta? <Link href={ACCOUNT_ROUTES.login} style={{ color: GOLD, textDecoration: "none", fontWeight: 700 }}>Entrar</Link>
        </p>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(8,8,8,0.96)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "48px 36px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <GoldLine />
        <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>Verifique seu email</h2>
        <p style={{ color: "#8d8578", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>Enviamos uma verificação para</p>
        <p style={{ color: GOLD, fontSize: 15, fontWeight: 600, margin: "0 0 24px" }}>{form.email}</p>
        <p style={{ color: "#615b52", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>Confirme o email para ativar sua conta. Depois volte aqui para entrar.</p>
        <button onClick={() => router.push(ACCOUNT_ROUTES.login)} style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 440, background: "rgba(8,8,8,0.96)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "42px 34px", position: "relative", zIndex: 1 }}>
      <GoldLine />
      <Logo />
      <p style={{ color: "#8d8578", fontSize: 14, textAlign: "center", marginTop: -18, marginBottom: accountHint ? 8 : 26 }}>{accountSubtitle}</p>
      {accountHint && (
        <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", lineHeight: 1.5, margin: "0 0 22px" }}>{accountHint}</p>
      )}
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
            Para publicar, será obrigatório enviar documento com foto, fotos reais e biometria facial. A idade exibida deve ser confirmada por documento.
          </p>
          <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(212,168,67,0.06)" }}>
            <p style={{ color: "#d4a843", fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", margin: "0 0 8px" }}>Fases do cadastro</p>
            <div style={{ display: "grid", gap: 6 }}>
              {["Dados do perfil", "Fotos e valores", "Documentos", "Biometria", "Análise da equipe"].map((item, index) => (
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
            Continuar como {form.accountType === "PROFESSIONAL" ? "profissional anunciante" : "anunciante de espaço"}
          </p>
          <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "0 0 12px" }}>
            Você já está logado. Vamos atualizar sua conta e abrir as etapas do cadastro.
          </p>
          <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Data de nascimento</label>
              <div style={{ display: "grid", gridTemplateColumns: "0.72fr 0.72fr 1fr", gap: 8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-day"
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
                  ref={monthRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-month"
                  maxLength={2}
                  placeholder="MM"
                  value={birthParts.month}
                  onChange={(e) => handleBirthPartChange("month", e.target.value)}
                  style={{ ...inputStyle, textAlign: "center" }}
                  onFocus={focusGold}
                  onBlur={blurGray}
                  aria-label="Mês de nascimento"
                />
                <input
                  ref={yearRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-year"
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
          </div>
          <button
            type="button"
            onClick={handleContinueExistingAccount}
            disabled={loading}
            style={{ width: "100%", padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Preparando cadastro..." : form.accountType === "PROFESSIONAL" ? "Ir para as fases do cadastro" : "Voltar ao anúncio"}
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.12)" }} />
            <span style={{ color: "#8d8578", fontSize: 13 }}>ou cadastre com email</span>
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
              ref={monthRef}
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
              aria-label="Mês de nascimento"
            />
            <input
              ref={yearRef}
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

        <button type="submit" disabled={loading} style={{ padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>}

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Já tem uma conta? <Link href={ACCOUNT_ROUTES.login} style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Entrar</Link>
      </p>
    </div>
  );
}
