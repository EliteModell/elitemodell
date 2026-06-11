"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Existing auth error payloads are provider-specific. */

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CaptchaField, type CaptchaFieldHandle } from "@/components/auth/CaptchaField";
import { validateBirthDate } from "@/lib/age-validation";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";
import { supabaseAuth } from "@/lib/supabase-client";
import {
  ACCOUNT_ROUTES,
  type CadastroTipo,
  type EntryAccountRole,
  internalAccountTypeFromTipo,
  normalizeCadastroTipo,
  normalizeEntryRole,
} from "@/lib/account-routes";

type AccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
type Category = "MULHER" | "TRANS" | "HOMEM";
type Step = "form" | "verify";
type BirthPart = "day" | "month" | "year";
const ROLE_INTENT_KEY = "elitemodell_login_role_intent";
const ROLE_INTENT_COOKIE = "elitemodell_login_role_intent";
const PENDING_REGISTRATION_KEY = "elitemodell_pending_registration";
const PENDING_REGISTRATION_COOKIE = "elitemodell_pending_registration";
type AuthError = { code?: string; name?: string; message?: string };

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";

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

function safeSetStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Navegadores privados podem negar storage; o OAuth ainda leva role/returnUrl na URL.
  }
}

function cookieDomainAttribute() {
  return window.location.hostname.endsWith("elitemodell.com.br")
    ? "; Domain=.elitemodell.com.br"
    : "";
}

function rememberPendingRegistration(payload: unknown) {
  const serialized = JSON.stringify(payload);
  safeSetStorage(sessionStorage, PENDING_REGISTRATION_KEY, serialized);
  safeSetStorage(localStorage, PENDING_REGISTRATION_KEY, serialized);
  document.cookie = `${PENDING_REGISTRATION_COOKIE}=${encodeURIComponent(serialized)}; Max-Age=900; Path=/${cookieDomainAttribute()}; SameSite=Lax; Secure`;
}

function rememberRoleIntent(intent: EntryAccountRole) {
  safeSetStorage(sessionStorage, ROLE_INTENT_KEY, intent);
  safeSetStorage(localStorage, ROLE_INTENT_KEY, intent);

  document.cookie = `${ROLE_INTENT_COOKIE}=${encodeURIComponent(intent)}; Max-Age=900; Path=/${cookieDomainAttribute()}; SameSite=Lax; Secure`;
}

function rememberCadastroOAuthState(payload: unknown, intent: EntryAccountRole) {
  rememberPendingRegistration(payload);
  rememberRoleIntent(intent);
}

function clearCadastroIntentState() {
  try {
    sessionStorage.removeItem(ROLE_INTENT_KEY);
    sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    localStorage.removeItem(ROLE_INTENT_KEY);
    localStorage.removeItem(PENDING_REGISTRATION_KEY);
  } catch {
    // Storage pode estar indisponivel em navegadores privados.
  }

  document.cookie = `${ROLE_INTENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  document.cookie = `${PENDING_REGISTRATION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  if (window.location.hostname.endsWith("elitemodell.com.br")) {
    document.cookie = `${ROLE_INTENT_COOKIE}=; Max-Age=0; Path=/; Domain=.elitemodell.com.br; SameSite=Lax; Secure`;
    document.cookie = `${PENDING_REGISTRATION_COOKIE}=; Max-Age=0; Path=/; Domain=.elitemodell.com.br; SameSite=Lax; Secure`;
  }
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

function AuthInfoFooter() {
  return (
    <div className="auth-info-footer">
      <section className="auth-info-card">
        <Link href="/" className="auth-info-brand" aria-label="Elite Modell">
          <span>elite</span>
          <strong>modell</strong>
        </Link>
        <div className="auth-restricted-badge">Ambiente restrito a maiores de 18 anos</div>
        <p>
          A Elite Modell conecta clientes, profissionais e locais reservados com discrição, segurança e uma experiência
          premium. Cadastre-se para acessar recursos, continuar fluxos pendentes ou ativar seu perfil.
        </p>
      </section>

      <section className="auth-link-groups">
        <div>
          <h2>Legal</h2>
          <Link href="/terms">Termos de Uso</Link>
          <Link href="/privacy">Política de Privacidade</Link>
        </div>
        <div>
          <h2>Suporte</h2>
          <Link href="/dashboard/informacoes">Central de ajuda</Link>
          <Link href="/esqueci-senha">Recuperar senha</Link>
        </div>
        <div>
          <h2>Segurança</h2>
          <Link href="/dashboard/verificacao-idade">Verificação de conta</Link>
          <Link href="/privacy">Como cuidamos dos seus dados</Link>
        </div>
      </section>

      <style>{`
        .auth-info-footer {
          width: 100%;
          max-width: 440px;
          margin: 24px auto 0;
          padding-bottom: calc(30px + env(safe-area-inset-bottom));
        }
        .auth-info-card,
        .auth-link-groups {
          border: 1px solid rgba(214,168,67,0.25);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          box-shadow: 0 24px 70px rgba(0,0,0,0.34);
        }
        .auth-info-card {
          padding: 24px 18px;
        }
        .auth-info-brand {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          margin-bottom: 14px;
          text-decoration: none;
          font-size: 22px;
          font-weight: 950;
        }
        .auth-info-brand span {
          background: ${GOLD_GRADIENT};
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .auth-info-brand strong {
          color: #fff;
          font: inherit;
        }
        .auth-restricted-badge {
          width: fit-content;
          border: 1px solid rgba(214,168,67,0.24);
          border-radius: 14px;
          background: rgba(214,168,67,0.12);
          color: #f5d78c;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .auth-info-card p {
          margin: 18px 0 0;
          color: #b8b8b8;
          font-size: 15px;
          line-height: 1.65;
        }
        .auth-link-groups {
          margin-top: 18px;
          padding: 24px 18px;
          display: grid;
          gap: 24px;
        }
        .auth-link-groups h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: 17px;
          font-weight: 950;
        }
        .auth-link-groups a {
          display: block;
          color: #b8b8b8;
          text-decoration: none;
          padding: 7px 0;
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}

export default function CadastroPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [accountTypeSelected, setAccountTypeSelected] = useState(false);
  const [continueIntent, setContinueIntent] = useState<EntryAccountRole | null>(null);
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
    ageConfirmed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [birthParts, setBirthParts] = useState<Record<BirthPart, string>>({
    day: "",
    month: "",
    year: "",
  });
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<CaptchaFieldHandle>(null);
  const autoContinueRef = useRef(false);
  const isAuthenticated = status === "authenticated";
  const isLoggedUpgradeFlow = isAuthenticated && form.accountType !== "GUEST";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draft = params.get("draft");
    const legacyClientEmail = params.get("legacy") === "cliente";
    const tipo = normalizeCadastroTipo(params.get("tipo"));
    const nextIntent = normalizeEntryRole(params.get("continue")) ?? normalizeEntryRole(params.get("role"));
    const shouldResumeRoomDraft = draft === "quarto" || draft === "imovel";
    const isFreshCadastroEntry = !tipo && !nextIntent && !draft;

    window.setTimeout(() => {
      setHydrated(true);
      setContinueIntent(nextIntent);
      if (isFreshCadastroEntry) {
        clearCadastroIntentState();
        setAccountTypeSelected(false);
        return;
      }

      // Draft de imóvel só aplica quando a URL pede explicitamente retomada.
      if (shouldResumeRoomDraft && tipo !== "acompanhante" && tipo !== "cliente") {
        setForm((current) => ({ ...current, accountType: "PROPERTY_HOST", category: "" }));
        setAccountTypeSelected(true);
        return;
      }

      if (tipo === "anfitriao") {
        router.replace(ACCOUNT_ROUTES.onboardingAnfitriao);
        return;
      }

      if (tipo === "acompanhante" && !legacyClientEmail) {
        setForm((current) => ({ ...current, accountType: "PROFESSIONAL" }));
        setAccountTypeSelected(true);
        return;
      }

      if (tipo === "cliente" && !legacyClientEmail) {
        // Mostra o form de e-mail/senha diretamente para clientes
        // (sem redirecionar para o fluxo de OTP por telefone)
        setForm((current) => ({ ...current, accountType: "GUEST", category: "" }));
        setAccountTypeSelected(true);
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
      router.replace(ACCOUNT_ROUTES.mainClientFeed);
    }
  }, [accountTypeSelected, form.accountType, hydrated, router, status]);

  useEffect(() => {
    if (!hydrated || !isLoggedUpgradeFlow || !session?.user?.id || autoContinueRef.current) return;

    let active = true;

    async function loadExistingRegistrationState() {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (!res.ok) return;
        const user = await res.json();
        if (!active) return;

        const savedBirthDate = user.birthDate ? String(user.birthDate).slice(0, 10) : "";
        if (savedBirthDate && !form.birthDate) {
          const [year, month, day] = savedBirthDate.split("-");
          setBirthParts({ day: day ?? "", month: month ?? "", year: year ?? "" });
        }

        const savedCategory = ["MULHER", "HOMEM", "TRANS"].includes(user.category) ? user.category as Category : "";
        const category = form.category || savedCategory;
        setForm((current) => ({
          ...current,
          birthDate: current.birthDate || savedBirthDate,
          termsConsent: current.termsConsent || Boolean(user.termsConsent),
          lgpdConsent: current.lgpdConsent || Boolean(user.lgpdConsent),
          ageConfirmed: current.ageConfirmed || Boolean(savedBirthDate),
          category: current.category || savedCategory,
        }));

        if (form.accountType !== "PROFESSIONAL") return;

        const professionalStatus = user.professional?.status as string | undefined;
        if (professionalStatus === "ACTIVE" || professionalStatus === "PAUSED") {
          autoContinueRef.current = true;
          router.replace(ACCOUNT_ROUTES.dashboardAcompanhante);
          return;
        }

        if (professionalStatus && professionalStatus !== "DRAFT") {
          autoContinueRef.current = true;
          router.replace(ACCOUNT_ROUTES.verificacaoAcompanhante);
          return;
        }

        if (savedBirthDate && user.termsConsent && user.lgpdConsent && category) {
          autoContinueRef.current = true;
          await postJsonOrThrow("/api/users/me/activate-professional", { category });
          router.replace(ACCOUNT_ROUTES.onboardingAcompanhante);
          router.refresh();
        }
      } catch (err) {
        console.warn("[cadastro] nao foi possivel retomar cadastro profissional automaticamente", err);
      }
    }

    loadExistingRegistrationState();
    return () => {
      active = false;
    };
  }, [form.accountType, form.birthDate, form.category, hydrated, isLoggedUpgradeFlow, router, session?.user?.id]);

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

  function resetCadastroTypeSelection() {
    clearCadastroIntentState();
    setContinueIntent(null);
    setErrors({});
    setForm((current) => ({ ...current, accountType: "GUEST", category: "" }));
    setAccountTypeSelected(false);
    window.history.replaceState(null, "", ACCOUNT_ROUTES.cadastro);
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

    if (!form.ageConfirmed) newErrors.ageConfirmed = "Confirme que voce e maior de 18 anos";

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

  function registrationPayload(captchaToken?: string) {
    const effectiveAccountType = continueIntent === "profissional" ? "PROFESSIONAL" : form.accountType;
    const payload = {
      role: effectiveAccountType === "PROFESSIONAL" ? "HOST" : "GUEST",
      accountType: effectiveAccountType,
      category: form.accountType === "PROFESSIONAL" ? form.category : undefined,
      birthDate: form.birthDate,
      lgpdConsent: form.lgpdConsent,
      termsConsent: form.termsConsent,
      ageConfirmed: form.ageConfirmed,
      name: form.name,
    };
    return captchaToken ? { ...payload, captchaToken } : payload;
  }

  async function getCaptchaToken() {
    try {
      console.info("[cadastro] solicitando token anti-spam");
      const token = await captchaRef.current?.getToken();
      console.info("[cadastro] token anti-spam gerado", {
        hasToken: Boolean(token),
        tokenLength: token?.length ?? 0,
      });
      return token;
    } catch (err) {
      console.error("[cadastro] falha ao gerar token anti-spam", {
        message: err instanceof Error ? err.message : "erro desconhecido",
      });
      toast.error(err instanceof Error ? err.message : "Confirme a verificação anti-spam.");
      throw err;
    }
  }

  async function registerUser(accessToken: string, captchaToken?: string) {
    const payload = registrationPayload(captchaToken);
    console.info("[cadastro] enviando cadastro ao backend", {
      accountType: payload.accountType,
      category: payload.category ?? null,
      hasBirthDate: Boolean(payload.birthDate),
      hasTermsConsent: Boolean(payload.termsConsent),
      hasLgpdConsent: Boolean(payload.lgpdConsent),
      hasCaptchaToken: Boolean(captchaToken),
      captchaTokenLength: captchaToken?.length ?? 0,
      loggedUpgradeFlow: isLoggedUpgradeFlow,
    });

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        ...payload,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[cadastro] backend recusou cadastro", {
        status: res.status,
        error: typeof data.error === "string" ? data.error : data.error ? "erro estruturado" : "erro ausente",
        hasCaptchaToken: Boolean(captchaToken),
        captchaTokenLength: captchaToken?.length ?? 0,
      });
      throw new Error(typeof data.error === "string" ? data.error : "Erro ao criar conta.");
    }
  }

  async function postJsonOrThrow(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "Nao foi possivel continuar o cadastro.");
    }
  }

  function nextAuthCadastroPayload(accessToken: string) {
    const payload = registrationPayload();
    return {
      accessToken,
      roleIntent: roleIntent(),
      authFlow: "cadastro",
      redirect: false,
      ...(payload.category ? { category: payload.category } : {}),
      ...(payload.birthDate ? { birthDate: payload.birthDate } : {}),
      ...(payload.lgpdConsent ? { lgpdConsent: "true" } : {}),
      ...(payload.termsConsent ? { termsConsent: "true" } : {}),
    };
  }

  function nextPath() {
    if (continueIntent === "profissional") return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (continueIntent === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
    if (form.accountType === "PROFESSIONAL") return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (form.accountType === "PROPERTY_HOST") {
      return ACCOUNT_ROUTES.onboardingAnfitriao;
    }
    return ACCOUNT_ROUTES.mainClientFeed;
  }

  async function resolvedNextPathAfterAuth() {
    const fallback = nextPath();
    try {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) return fallback;
      const user = await res.json();
      return typeof user?.redirectTo === "string" ? user.redirectTo : fallback;
    } catch {
      return fallback;
    }
  }

  function roleIntent() {
    if (continueIntent) return continueIntent;
    if (form.accountType === "PROFESSIONAL") return "profissional";
    if (form.accountType === "PROPERTY_HOST") return "anfitriao";
    return "cliente";
  }

  function callbackParams() {
    const intent = roleIntent();
    const params = new URLSearchParams({
      returnUrl: nextPath(),
      role: intent,
      flow: "cadastro",
    });
    if (intent === "profissional") params.set("intent", "professional-signup");
    return params.toString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRequiredForm(true)) return;

    setLoading(true);
    try {
      const captchaToken = await getCaptchaToken();
      const { data, error } = await supabaseAuth.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(callbackParams()),
          data: registrationPayload(),
        },
      });
      if (error) throw error;
      if (data.session?.access_token) {
        await registerUser(data.session.access_token, captchaToken);
        const res = await signIn("supabase", nextAuthCadastroPayload(data.session.access_token));
        if (res?.ok) {
          router.push(await resolvedNextPathAfterAuth());
          router.refresh();
          return;
        }
      }
      rememberPendingRegistration(registrationPayload(captchaToken));
      setStep("verify");
    } catch (err: unknown) {
      const authError = asAuthError(err);
      if ((authError.code === "user_already_exists" || authError.name === "user_already_exists") && isValidEmail(form.email)) {
        try {
          const { data, error } = await supabaseAuth.auth.signInWithPassword({
            email: form.email.trim().toLowerCase(),
            password: form.password,
          });
          if (error || !data.session?.access_token) throw error ?? new Error("E-mail ou senha invÃ¡lidos.");
          const res = await signIn("supabase", nextAuthCadastroPayload(data.session.access_token));
          if (res?.error) throw new Error("NÃ£o foi possÃ­vel atualizar sua sessÃ£o.");
          router.push(await resolvedNextPathAfterAuth());
          router.refresh();
          return;
        } catch {
          toast.error("Este email jÃ¡ existe. Entre com a senha correta para continuar.");
          return;
        }
      }

      captchaRef.current?.reset();
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
    if (!validateRequiredForm(false, true)) return;

    setLoading(true);
    try {
      const intent = roleIntent();
      console.info("[cadastro] iniciando cadastro Google sem CAPTCHA local", {
        intent,
        accountType: form.accountType,
        provider: "google",
      });
      rememberCadastroOAuthState(registrationPayload(), intent);
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildAuthCallbackUrl(callbackParams()) },
      });
      if (error) throw error;
    } catch (err: unknown) {
      captchaRef.current?.reset();
      toast.error(asAuthError(err).message ?? "Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueExistingAccount() {
    if (!validateRequiredForm(false, true)) return;

    if (form.accountType === "PROFESSIONAL" && !form.category) {
      setErrors((current) => ({ ...current, category: "Selecione a categoria do anuncio" }));
      toast.error("Selecione a categoria do anuncio.");
      return;
    }

    setLoading(true);
    try {
      console.info("[cadastro] continuando cadastro com usuario autenticado; CAPTCHA dispensado", {
        accountType: form.accountType,
        category: form.category || null,
      });

      await postJsonOrThrow("/api/auth/complete-profile", {
        birthDate: form.birthDate,
        lgpdConsent: true,
        termsConsent: true,
        ageConfirmed: form.ageConfirmed,
      });

      if (form.accountType === "PROFESSIONAL") {
        await postJsonOrThrow("/api/users/me/activate-professional", { category: form.category });
      } else {
        const { data } = await supabaseAuth.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) await registerUser(accessToken);
      }

      const { data } = await supabaseAuth.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        const res = await signIn("supabase", nextAuthCadastroPayload(accessToken));
        if (res?.error) console.warn("[cadastro] refresh de sessao apos continuar cadastro falhou", res.error);
      }

      router.replace(await resolvedNextPathAfterAuth());
      router.refresh();
    } catch (err: unknown) {
      captchaRef.current?.reset();
      toast.error(asAuthError(err).message ?? "Nao foi possivel continuar o cadastro.");
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
      <main style={{ width: "100%", maxWidth: 620, padding: "max(18px, env(safe-area-inset-top)) 0 0" }}>
      <div style={{ width: "100%", maxWidth: 620, background: "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98))", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 24, padding: "34px 28px", position: "relative", zIndex: 1, boxShadow: "0 24px 70px rgba(0,0,0,0.34)" }}>
        <GoldLine />
        <Logo />
        <div style={{ textAlign: "center", margin: "-12px 0 24px" }}>
          <p style={{ color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase", margin: "0 0 8px" }}>Cadastro Elite Modell</p>
          <h1 style={{ color: "#f4f1ea", fontSize: 24, lineHeight: 1.15, margin: 0 }}>Como você quer se cadastrar?</h1>
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
      <AuthInfoFooter />
      </main>
    );
  }

  if (step === "verify") {
    return (
      <main style={{ width: "100%", maxWidth: 440, padding: "max(18px, env(safe-area-inset-top)) 0 0" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(8,8,8,0.96)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 16, padding: "48px 36px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <GoldLine />
        <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>Verifique seu email</h2>
        <p style={{ color: "#8d8578", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>Enviamos uma verificação para</p>
        <p style={{ color: GOLD, fontSize: 15, fontWeight: 600, margin: "0 0 24px" }}>{form.email}</p>
        <p style={{ color: "#615b52", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>Confirme o email para ativar sua conta. Depois volte aqui para entrar.</p>
        <button onClick={() => router.push(`${ACCOUNT_ROUTES.login}?role=cliente`)} style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          Ir para o login
        </button>
      </div>
      <AuthInfoFooter />
      </main>
    );
  }

  return (
    <main style={{ width: "100%", maxWidth: 440, padding: "max(18px, env(safe-area-inset-top)) 0 0" }}>
    <div style={{ width: "100%", maxWidth: 440, background: "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98))", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 24, padding: "42px 34px", position: "relative", zIndex: 1, boxShadow: "0 24px 70px rgba(0,0,0,0.34)" }}>
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
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>
            <input type="checkbox" checked={form.ageConfirmed} onChange={(e) => setForm({ ...form, ageConfirmed: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
            <span>
              Confirmo que sou maior de 18 anos e li a <Link href="/documentos/adult-declaration" style={{ color: GOLD, textDecoration: "none" }}>Confirmacao de Maioridade</Link>.
              {errors.ageConfirmed && <span data-auth-required-error="true" style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.ageConfirmed}</span>}
            </span>
          </label>

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
          <CaptchaField ref={captchaRef} />
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

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={form.ageConfirmed} onChange={(e) => setForm({ ...form, ageConfirmed: e.target.checked })} style={{ marginTop: 2, accentColor: GOLD }} />
          <span>
            Confirmo que sou maior de 18 anos e li a <Link href="/documentos/adult-declaration" style={{ color: GOLD, textDecoration: "none" }}>Confirmacao de Maioridade</Link>.
            {errors.ageConfirmed && <span data-auth-required-error="true" style={{ display: "block", color: "#ef4444", marginTop: 4 }}>{errors.ageConfirmed}</span>}
          </span>
        </label>

        <button type="submit" disabled={loading} style={{ padding: "13px", background: loading ? "#9e7b2a" : GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>}

      <button
        type="button"
        onClick={resetCadastroTypeSelection}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "11px 13px",
          border: "1px solid rgba(212,168,67,0.24)",
          borderRadius: 8,
          background: "rgba(212,168,67,0.06)",
          color: GOLD,
          fontSize: 13,
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        Trocar tipo de cadastro
      </button>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#475569" }}>
        Já tem uma conta? <Link href={ACCOUNT_ROUTES.login} style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Entrar</Link>
      </p>
    </div>
    <AuthInfoFooter />
    </main>
  );
}
