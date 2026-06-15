"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES, hostPathForStatus, normalizeEntryRole, postLoginPathFromUser } from "@/lib/account-routes";

type PendingRegistration = {
  accountType?: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
  category?: "MULHER" | "HOMEM" | "TRANS";
  birthDate?: string;
  lgpdConsent?: boolean;
  termsConsent?: boolean;
  ageConfirmed?: boolean;
  captchaToken?: string;
};

const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;
const ROLE_INTENT_KEY = "elitemodell_login_role_intent";
const ROLE_INTENT_COOKIE = "elitemodell_login_role_intent";
const PENDING_REGISTRATION_KEY = "elitemodell_pending_registration";
const PENDING_REGISTRATION_COOKIE = "elitemodell_pending_registration";
const CALLBACK_TIMEOUT_MS = 5000;
const NEXTAUTH_SIGNIN_TIMEOUT_MS = 45000;
const CALLBACK_SLOW_MESSAGE_MS = 2500;
const CALLBACK_STILL_WORKING_MESSAGE_MS = 9000;
const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

function hasPropertyDraft() {
  return Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));
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

function inferRoleIntentFromReturnUrl(returnUrl: string | null) {
  if (!returnUrl) return null;
  if (returnUrl.startsWith("/profissional") || returnUrl.startsWith("/verificacao/acompanhante") || returnUrl.startsWith("/painel/acompanhante")) {
    return "profissional" as const;
  }
  if (returnUrl.startsWith("/anfitriao") || returnUrl.startsWith("/verificacao/anfitriao") || returnUrl.startsWith("/painel/anfitriao")) {
    return "anfitriao" as const;
  }
  if (returnUrl.startsWith("/dashboard") || returnUrl.startsWith("/painel/cliente")) {
    return "cliente" as const;
  }
  return null;
}

const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"];

async function getPostLoginPath(roleIntent?: ReturnType<typeof normalizeEntryRole>) {
  const res = await fetch("/api/users/me", { cache: "no-store" });
  if (!res.ok) return fallbackPathForRoleIntent(roleIntent);

  const user = await res.json();

  if (roleIntent === "anfitriao") {
    if (hasPropertyDraft()) return PROPERTY_DRAFT_FINAL_PATH;
    return hostPathForStatus(user.hostStatus ?? "NO_REQUEST");
  }

  if (user.role === "ADMIN") return ACCOUNT_ROUTES.admin;
  const isProfessional = PROFESSIONAL_CATEGORIES.includes(user.category);
  const hasProfessionalAccess =
    Boolean(user.professional) ||
    user.accountType === "model" ||
    user.accountType === "professional" ||
    isProfessional;

  if (roleIntent === "profissional") {
    if (!hasProfessionalAccess) return ACCOUNT_ROUTES.cadastroAcompanhante;
    return postLoginPathFromUser(user, roleIntent);
  }

  // Usuário sem consentimento ou sem data de nascimento → completar cadastro obrigatório
  if (!user.lgpdConsent || !user.termsConsent || !user.birthDate) {
    return "/completar-cadastro";
  }

  if (user.role === "HOST" && isProfessional) {
    if (!user.professional) return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (user.professional.status === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
    return postLoginPathFromUser(user, roleIntent);
  }

  return postLoginPathFromUser(user, roleIntent);
}

async function clearInvalidAuthState() {
  clearRoleIntentStorage();
  clearPendingRegistrationStorage();
  await supabaseAuth.auth.signOut().catch(() => undefined);
  await signOut({ redirect: false }).catch(() => undefined);
}

function fallbackPathForRoleIntent(roleIntent?: ReturnType<typeof normalizeEntryRole>) {
  if (roleIntent === "profissional") return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (roleIntent === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
  return ACCOUNT_ROUTES.dashboardCliente;
}

function callbackRetryHref(roleIntent: ReturnType<typeof normalizeEntryRole>, returnUrl: string | null, isCadastroFlow: boolean) {
  const params = new URLSearchParams();
  if (isCadastroFlow) params.set("flow", "cadastro");
  if (roleIntent) params.set("role", roleIntent);
  if (returnUrl) params.set("returnUrl", returnUrl);
  return `/auth/callback${params.toString() ? `?${params.toString()}` : ""}`;
}

function loginRetryHref(roleIntent: ReturnType<typeof normalizeEntryRole>, returnUrl: string | null) {
  const params = new URLSearchParams();
  if (roleIntent) params.set("role", roleIntent);
  if (returnUrl) params.set("returnUrl", returnUrl);
  return `/login${params.toString() ? `?${params.toString()}` : ""}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function clearRoleIntentStorage() {
  sessionStorage.removeItem(ROLE_INTENT_KEY);
  localStorage.removeItem(ROLE_INTENT_KEY);
  document.cookie = `${ROLE_INTENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  if (window.location.hostname.endsWith("elitemodell.com.br")) {
    document.cookie = `${ROLE_INTENT_COOKIE}=; Max-Age=0; Path=/; Domain=.elitemodell.com.br; SameSite=Lax; Secure`;
  }
}

function clearPendingRegistrationStorage() {
  sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
  localStorage.removeItem(PENDING_REGISTRATION_KEY);
  document.cookie = `${PENDING_REGISTRATION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  if (window.location.hostname.endsWith("elitemodell.com.br")) {
    document.cookie = `${PENDING_REGISTRATION_COOKIE}=; Max-Age=0; Path=/; Domain=.elitemodell.com.br; SameSite=Lax; Secure`;
  }
}

function resolveWithTimeout<T>(promise: Promise<T>, fallback: T, ms = CALLBACK_TIMEOUT_MS) {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForNextAuthSession(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const session = await res.json().catch(() => null);
        if (session?.user?.email || session?.user?.id) return true;
      }
    } catch {
      // Algumas WebViews mobile falham a primeira leitura logo apos set-cookie.
    }

    await sleep(300);
  }

  return false;
}

function resolveSignInWithTimeout(promise: ReturnType<typeof signIn>) {
  return resolveWithTimeout(
    promise,
    { error: "Tempo limite ao criar a sessao segura. Tente novamente.", status: 408, ok: false, url: null },
    NEXTAUTH_SIGNIN_TIMEOUT_MS,
  );
}

function parseCallbackHash() {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!rawHash) return null;
  return new URLSearchParams(rawHash);
}

function clearCallbackHash() {
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, document.title, cleanUrl);
}

async function consumeHashSession() {
  const hashParams = parseCallbackHash();
  if (!hashParams) return null;

  const oauthError = hashParams.get("error_description") || hashParams.get("error");
  if (oauthError) {
    clearCallbackHash();
    throw new Error(`Supabase OAuth: ${oauthError}`);
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabaseAuth.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  clearCallbackHash();

  if (error) {
    console.error("[CALLBACK] setSession pelo hash falhou:", error.message);
    throw new Error("Nao foi possivel confirmar a sessao recebida do provedor.");
  }

  if (!data.session?.access_token) {
    throw new Error("Sessao criada pelo provedor nao retornou token de acesso.");
  }

  return data.session.access_token;
}

function getRegistrationPath(pending: PendingRegistration | null) {
  if (pending?.accountType === "PROFESSIONAL") return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (pending?.accountType === "PROPERTY_HOST") {
    return hasPropertyDraft() ? PROPERTY_DRAFT_FINAL_PATH : ACCOUNT_ROUTES.onboardingAnfitriao;
  }
  return ACCOUNT_ROUTES.dashboardCliente;
}

function roleIntentFromPending(pending: PendingRegistration | null) {
  if (pending?.accountType === "PROFESSIONAL") return "profissional" as const;
  if (pending?.accountType === "PROPERTY_HOST") return "anfitriao" as const;
  if (pending?.accountType === "GUEST") return "cliente" as const;
  return null;
}

function accountTypeFromMetadata(value: unknown): PendingRegistration["accountType"] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (["GUEST", "CLIENT", "CLIENTE"].includes(normalized)) return "GUEST";
  if (["PROFESSIONAL", "MODEL", "MODELO", "ACOMPANHANTE"].includes(normalized)) return "PROFESSIONAL";
  if (["PROPERTY_HOST", "HOST", "ANFITRIAO", "ANFITRIÃO", "IMOVEL", "IMÓVEL"].includes(normalized)) return "PROPERTY_HOST";
  return null;
}

function professionalCategoryFromMetadata(value: unknown): PendingRegistration["category"] | undefined {
  return typeof value === "string" && PROFESSIONAL_CATEGORIES.includes(value)
    ? value as PendingRegistration["category"]
    : undefined;
}

function booleanFromMetadata(value: unknown) {
  return value === true || value === "true";
}

function pendingRegistrationFromMetadata(metadata: unknown): PendingRegistration | null {
  if (!metadata || typeof metadata !== "object") return null;
  const data = metadata as Record<string, unknown>;
  const accountType = accountTypeFromMetadata(data.accountType ?? data.account_type);
  if (!accountType) return null;

  return {
    accountType,
    category: accountType === "PROFESSIONAL" ? professionalCategoryFromMetadata(data.category) : undefined,
    birthDate: typeof data.birthDate === "string" ? data.birthDate : undefined,
    lgpdConsent: booleanFromMetadata(data.lgpdConsent),
    termsConsent: booleanFromMetadata(data.termsConsent),
    ageConfirmed: booleanFromMetadata(data.ageConfirmed),
  };
}

async function pendingRegistrationFromSession(accessToken: string) {
  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error) {
    console.warn("[CALLBACK] Nao foi possivel ler metadata do usuario Supabase:", error.message);
    return null;
  }
  return pendingRegistrationFromMetadata(data.user?.user_metadata);
}

function registrationFallbackForIntent(
  pending: PendingRegistration | null,
  roleIntent: ReturnType<typeof normalizeEntryRole>,
  isCadastroFlow: boolean,
) {
  if (pending) return pending;
  if (!isCadastroFlow) return null;
  if (roleIntent === "profissional") return { accountType: "PROFESSIONAL" as const };
  if (roleIntent === "anfitriao") return { accountType: "PROPERTY_HOST" as const };
  return { accountType: "GUEST" as const };
}

function readPendingRegistrationRaw() {
  return sessionStorage.getItem(PENDING_REGISTRATION_KEY)
    ?? localStorage.getItem(PENDING_REGISTRATION_KEY)
    ?? readCookie(PENDING_REGISTRATION_COOKIE);
}

function parsePendingRegistration(raw: string | null) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const validTypes = ["GUEST", "PROFESSIONAL", "PROPERTY_HOST"];
    if (!parsed || typeof parsed !== "object") return null;

    const pending = parsed as PendingRegistration;
    if ("accountType" in parsed && pending.accountType && !validTypes.includes(pending.accountType)) {
      return null;
    }
    if (pending.category && !PROFESSIONAL_CATEGORIES.includes(pending.category)) {
      return null;
    }

    return pending;
  } catch {
    console.warn("[CALLBACK] Cadastro pendente corrompido no navegador. Ignorando.");
    return null;
  }
}

async function parseJsonError(res: Response) {
  const payload = await res.json().catch(() => ({}));
  return typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error ?? payload);
}

async function applyRegistrationFallback(pending: PendingRegistration, roleIntent: ReturnType<typeof normalizeEntryRole>) {
  if (pending.birthDate && pending.lgpdConsent && pending.termsConsent) {
    const profileRes = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: pending.birthDate,
        lgpdConsent: true,
        termsConsent: true,
        ageConfirmed: pending.ageConfirmed ?? true,
      }),
    });

    if (!profileRes.ok) {
      console.error("[CALLBACK] Fallback de consentimento/data falhou:", {
        status: profileRes.status,
        error: await parseJsonError(profileRes),
      });
    }
  }

  if (roleIntent === "profissional" || pending.accountType === "PROFESSIONAL") {
    const activateRes = await fetch("/api/users/me/activate-professional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: pending.category }),
    });

    if (!activateRes.ok) {
      console.error("[CALLBACK] Fallback de ativacao profissional falhou:", {
        status: activateRes.status,
        error: await parseJsonError(activateRes),
      });
    }
  }
}

function CallbackCard({ message, success, error, retryHref = "/login" }: { message: string; success?: boolean; error?: string; retryHref?: string }) {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.06) 0%, #050505 60%)",
      padding: 24,
    }}>
      <style>{`
        @keyframes em-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes em-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes em-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(10,10,10,0.96)",
        border: error ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(212,168,67,0.28)",
        borderRadius: 16,
        padding: "40px 32px 36px",
        textAlign: "center",
        position: "relative",
        animation: "em-fadein 0.4s ease",
        boxShadow: error
          ? "0 0 60px rgba(248,113,113,0.08), 0 20px 60px rgba(0,0,0,0.6)"
          : "0 0 60px rgba(212,168,67,0.06), 0 20px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Top line */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 2,
          borderRadius: "16px 16px 0 0",
          background: error
            ? "linear-gradient(90deg, transparent 0%, #f87171 30%, #fca5a5 50%, #f87171 70%, transparent 100%)"
            : "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)",
        }} />

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.5px" }}>
            <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </div>

        {/* Error icon */}
        {error && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: "50%",
              background: "rgba(248,113,113,0.12)",
              border: "1.5px solid #f87171",
              display: "grid",
              placeItems: "center",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Spinner */}
        {!success && !error && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "2.5px solid rgba(212,168,67,0.15)",
              borderTopColor: GOLD,
              animation: "em-spin 0.9s linear infinite",
            }} />
          </div>
        )}

        {/* Check icon on success */}
        {success && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: "50%",
              background: "rgba(212,168,67,0.12)",
              border: `1.5px solid ${GOLD}`,
              display: "grid",
              placeItems: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Message */}
        <p style={{
          color: error ? "#fca5a5" : "#cbd5e1",
          fontSize: error ? 16 : 15,
          fontWeight: error ? 700 : 500,
          margin: 0,
          lineHeight: 1.5,
          animation: error ? undefined : "em-pulse 2s ease-in-out infinite",
        }}>
          {message}
        </p>

        {/* Error detail box */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 8,
            textAlign: "left",
          }}>
            <p style={{ color: "#94a3b8", fontSize: 11, margin: "0 0 4px", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
              Mensagem
            </p>
            <p style={{ color: "#f87171", fontSize: 13, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>
              {error}
            </p>
          </div>
        )}

        {/* Retry link when error */}
        {error && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
            <a
              href={retryHref}
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "rgba(212,168,67,0.12)",
                border: `1px solid ${GOLD}`,
                borderRadius: 8,
                color: GOLD,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              Tentar novamente
            </a>
            <a
              href={ACCOUNT_ROUTES.cadastro}
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "transparent",
                border: "1px solid rgba(148,163,184,0.32)",
                borderRadius: 8,
                color: "#cbd5e1",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              Voltar ao cadastro
            </a>
          </div>
        )}

        {/* Subtle bottom label */}
        <p style={{ color: "#334155", fontSize: 11, margin: "20px 0 0", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Acesso seguro
        </p>
      </div>
    </main>
  );
}

function waitForSession(timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (token: string | null) => {
      if (settled) return;
      settled = true;
      sub?.data.subscription.unsubscribe();
      clearTimeout(timer);
      if (token) resolve(token);
      else reject(new Error("Sessao nao encontrada no navegador apos o retorno do provedor."));
    };

    const timer = setTimeout(() => done(null), timeoutMs);

    // Fast path: session already in storage (PKCE code was exchanged or hash already parsed)
    supabaseAuth.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) done(data.session.access_token);
    });

    // Slow path: wait for detectSessionInUrl to process hash fragment (implicit flow / mobile)
    const sub = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) done(session.access_token);
    });
  });
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verificando suas credenciais...");
  const [success, setSuccess] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | undefined>(undefined);
  const [retryHref, setRetryHref] = useState("/login");

  useEffect(() => {
    let active = true;
    const rawReturnParam = searchParams.get("returnUrl") ?? searchParams.get("redirectTo");
    const returnUrl = safeInternalPath(rawReturnParam);
    const hasExplicitReturnUrl = Boolean(rawReturnParam && returnUrl);
    const pendingRegistration = parsePendingRegistration(readPendingRegistrationRaw());
    const explicitIntent = searchParams.get("intent");
    const hasProfessionalSignupIntent =
      explicitIntent === "professional-signup" ||
      roleIntentFromPending(pendingRegistration) === "profissional";
    const roleIntent = normalizeEntryRole(searchParams.get("role"))
      ?? (hasProfessionalSignupIntent ? "profissional" : null)
      ?? roleIntentFromPending(pendingRegistration)
      ?? inferRoleIntentFromReturnUrl(returnUrl)
      ?? normalizeEntryRole(sessionStorage.getItem(ROLE_INTENT_KEY))
      ?? normalizeEntryRole(localStorage.getItem(ROLE_INTENT_KEY))
      ?? normalizeEntryRole(readCookie(ROLE_INTENT_COOKIE));
    const isCadastroFlow =
      searchParams.get("flow") === "cadastro" ||
      Boolean(pendingRegistration) ||
      explicitIntent === "professional-signup";
    const initialRetryRoleIntent =
      roleIntent ??
      roleIntentFromPending(pendingRegistration) ??
      inferRoleIntentFromReturnUrl(returnUrl) ??
      (isCadastroFlow ? "cliente" as const : null);
    const initialRetryReturnUrl = returnUrl ?? (initialRetryRoleIntent ? fallbackPathForRoleIntent(initialRetryRoleIntent) : null);
    const retryTarget = isCadastroFlow && (initialRetryRoleIntent === "profissional" || returnUrl?.startsWith(ACCOUNT_ROUTES.onboardingAcompanhante))
      ? ACCOUNT_ROUTES.cadastroAcompanhante
      : loginRetryHref(initialRetryRoleIntent, initialRetryReturnUrl);
    const retryHrefTimer = window.setTimeout(() => {
      if (active) setRetryHref(retryTarget);
    }, 0);
    const slowMessageTimer = window.setTimeout(() => {
      if (active) setMessage("Estamos finalizando seu acesso. Aguarde um instante.");
    }, CALLBACK_SLOW_MESSAGE_MS);
    const stillWorkingTimer = window.setTimeout(() => {
      if (active) setMessage("Ainda estamos criando sua sessao segura. No celular isso pode levar alguns segundos.");
    }, CALLBACK_STILL_WORKING_MESSAGE_MS);

    async function finishAuth() {
      const code = searchParams.get("code");
      let accessToken: string;

      if (code) {
        const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: existing } = await supabaseAuth.auth.getSession();
          if (existing.session?.access_token) {
            accessToken = existing.session.access_token;
          } else {
            console.error("[CALLBACK] exchangeCodeForSession falhou:", error.message);
            throw new Error(`Supabase: ${error.message}`);
          }
        } else {
          if (!data.session?.access_token) throw new Error("Sessao nao encontrada apos troca de codigo.");
          accessToken = data.session.access_token;
        }
      } else {
        accessToken = await consumeHashSession() ?? await waitForSession();
        if (!accessToken) throw new Error("Sessao nao encontrada. Tente novamente.");
      }

      if (active) setMessage("Configurando sua conta...");

      const metadataRegistration = await pendingRegistrationFromSession(accessToken);
      const effectivePendingRegistration = pendingRegistration ?? metadataRegistration;
      const effectiveCadastroFlow = isCadastroFlow || Boolean(effectivePendingRegistration);
      const effectiveRoleIntent =
        roleIntent ??
        roleIntentFromPending(effectivePendingRegistration) ??
        inferRoleIntentFromReturnUrl(returnUrl) ??
        (effectiveCadastroFlow ? "cliente" as const : null);
      const fallbackRegistration = registrationFallbackForIntent(effectivePendingRegistration, effectiveRoleIntent, effectiveCadastroFlow);
      const registrationForCredentials = effectivePendingRegistration ?? fallbackRegistration;

      if (active) setMessage("Criando sessao segura...");
      const res = await resolveSignInWithTimeout(signIn("supabase", {
        accessToken,
        roleIntent: effectiveRoleIntent ?? "",
        authFlow: (effectiveCadastroFlow || fallbackRegistration) ? "cadastro" : "",
        redirect: false,
        ...(registrationForCredentials?.category ? { category: registrationForCredentials.category } : {}),
        ...(registrationForCredentials?.birthDate ? { birthDate: registrationForCredentials.birthDate } : {}),
        ...(registrationForCredentials?.lgpdConsent ? { lgpdConsent: "true" } : {}),
        ...(registrationForCredentials?.termsConsent ? { termsConsent: "true" } : {}),
      }));
      if (res?.error) {
        throw new Error(`NextAuth: ${res.error}`);
      }

      if (active) setMessage("Confirmando sessao segura...");
      const hasNextAuthSession = await waitForNextAuthSession();
      if (!hasNextAuthSession) {
        throw new Error("NextAuth: Tempo limite ao confirmar a sessao segura.");
      }

      if (fallbackRegistration) {
        if (active) setMessage("Preparando sua conta...");
        await applyRegistrationFallback(fallbackRegistration, effectiveRoleIntent);
      }

      clearRoleIntentStorage();
      clearPendingRegistrationStorage();

      // Fast path: se há returnUrl explícita e não é um novo cadastro, redirecionar
      // direto sem buscar /api/users/me (economiza 300–800ms por login).
      const targetPath = fallbackRegistration && effectiveRoleIntent
        ? await resolveWithTimeout(getPostLoginPath(effectiveRoleIntent), getRegistrationPath(fallbackRegistration))
        : fallbackRegistration
          ? getRegistrationPath(fallbackRegistration)
          : hasExplicitReturnUrl && returnUrl
            ? returnUrl
            : effectiveRoleIntent
              ? await resolveWithTimeout(getPostLoginPath(effectiveRoleIntent), fallbackPathForRoleIntent(effectiveRoleIntent))
              : returnUrl ?? await resolveWithTimeout(getPostLoginPath(undefined), ACCOUNT_ROUTES.dashboardCliente);

      if (!active) return;
      window.clearTimeout(slowMessageTimer);
      window.clearTimeout(stillWorkingTimer);
      setSuccess(true);
      setMessage("Acesso confirmado. Redirecionando...");
      window.setTimeout(() => {
        window.location.replace(targetPath);
      }, 200);
    }

    finishAuth().catch(async (err) => {
      window.clearTimeout(slowMessageTimer);
      window.clearTimeout(stillWorkingTimer);
      if (!active) return;
      const rawMsg: string = err?.message ?? "Nao foi possivel finalizar o acesso.";
      const isCadastroError = isCadastroFlow;
      console.error(isCadastroError ? "[CALLBACK] Erro no cadastro:" : "[CALLBACK] Erro no login:", rawMsg);
      const timedOut = /tempo limite|timeout|timed out/i.test(rawMsg);
      const retryRoleIntent = roleIntent ?? roleIntentFromPending(pendingRegistration) ?? inferRoleIntentFromReturnUrl(returnUrl) ?? "cliente";
      const retryReturnUrl = returnUrl ?? fallbackPathForRoleIntent(retryRoleIntent);
      const { data: currentSupabaseSession } = await supabaseAuth.auth.getSession().catch(() => ({ data: { session: null } }));
      if (timedOut && currentSupabaseSession.session?.access_token) {
        setRetryHref(callbackRetryHref(retryRoleIntent, retryReturnUrl, true));
      } else {
        await clearInvalidAuthState();
        setRetryHref(loginRetryHref(retryRoleIntent, retryReturnUrl));
      }
      setMessage(timedOut
        ? "Email confirmado. Falta finalizar sua sessao."
        : isCadastroError
          ? "Não foi possível concluir o cadastro. Tente novamente ou use outro método."
          : "Não foi possível concluir o login. Tente novamente ou use outro método.");
      setErrorDetail(timedOut
        ? "A confirmacao foi feita, mas a sessao demorou mais que o esperado. Toque em Tentar novamente ou entre com email e senha."
        : "O link pode ter expirado ou ja ter sido usado. Tente entrar com email e senha ou solicite um novo link.");
    });

    return () => {
      active = false;
      window.clearTimeout(retryHrefTimer);
      window.clearTimeout(slowMessageTimer);
      window.clearTimeout(stillWorkingTimer);
    };
  }, [searchParams]);

  return <CallbackCard message={message} success={success} error={errorDetail} retryHref={retryHref} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard message="Carregando..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
