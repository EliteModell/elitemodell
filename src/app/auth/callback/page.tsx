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
  captchaToken?: string;
};

const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;
const ROLE_INTENT_KEY = "elitemodell_login_role_intent";
const ROLE_INTENT_COOKIE = "elitemodell_login_role_intent";
const PENDING_REGISTRATION_KEY = "elitemodell_pending_registration";
const CALLBACK_TIMEOUT_MS = 15000;
const NEXTAUTH_SIGNIN_TIMEOUT_MS = 12000;
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
    if (!hasProfessionalAccess) return `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`;
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

function readPendingRegistrationRaw(allowLocalStorage: boolean) {
  if (!allowLocalStorage) return null;
  return sessionStorage.getItem(PENDING_REGISTRATION_KEY) ?? localStorage.getItem(PENDING_REGISTRATION_KEY);
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
          <a
            href={retryHref}
            style={{
              display: "inline-block",
              marginTop: 20,
              padding: "10px 24px",
              background: "rgba(212,168,67,0.12)",
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              color: GOLD,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: 0.3,
            }}
          >
            Tentar novamente
          </a>
        )}

        {/* Subtle bottom label */}
        <p style={{ color: "#334155", fontSize: 11, margin: "20px 0 0", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Acesso seguro
        </p>
      </div>
    </main>
  );
}

function waitForSession(timeoutMs = 8000): Promise<string> {
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
    const returnUrl = safeInternalPath(searchParams.get("returnUrl") ?? searchParams.get("redirectTo"));
    const isCadastroFlow = searchParams.get("flow") === "cadastro";
    const roleIntent = normalizeEntryRole(searchParams.get("role"))
      ?? inferRoleIntentFromReturnUrl(returnUrl)
      ?? normalizeEntryRole(sessionStorage.getItem(ROLE_INTENT_KEY))
      ?? normalizeEntryRole(localStorage.getItem(ROLE_INTENT_KEY))
      ?? normalizeEntryRole(readCookie(ROLE_INTENT_COOKIE));
    const retryTarget = isCadastroFlow && (roleIntent === "profissional" || returnUrl?.startsWith(ACCOUNT_ROUTES.onboardingAcompanhante))
      ? `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`
      : "/login";
    setRetryHref(retryTarget);

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

      const pendingRegistration = parsePendingRegistration(readPendingRegistrationRaw(isCadastroFlow));
      const effectiveRoleIntent = roleIntent ?? roleIntentFromPending(pendingRegistration) ?? inferRoleIntentFromReturnUrl(returnUrl);
      let shouldRunRegistrationFallback = false;

      if (pendingRegistration) {
        try {
          const regRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, ...pendingRegistration }),
          });
          if (!regRes.ok) {
            throw new Error(`${regRes.status}: ${await parseJsonError(regRes)}`);
          }
        } catch (registerErr) {
          shouldRunRegistrationFallback = true;
          console.error("[CALLBACK] Cadastro OAuth pendente falhou antes da sessao; seguindo com fallback:", {
            error: registerErr instanceof Error ? registerErr.message : registerErr,
            roleIntent: effectiveRoleIntent,
            accountType: pendingRegistration.accountType,
          });
        }
      }

      if (active) setMessage("Criando sessao segura...");
      const res = await resolveSignInWithTimeout(signIn("supabase", {
        accessToken,
        roleIntent: effectiveRoleIntent ?? "",
        authFlow: isCadastroFlow ? "cadastro" : "",
        redirect: false,
        ...(pendingRegistration?.category ? { category: pendingRegistration.category } : {}),
        ...(pendingRegistration?.birthDate ? { birthDate: pendingRegistration.birthDate } : {}),
        ...(pendingRegistration?.lgpdConsent ? { lgpdConsent: "true" } : {}),
        ...(pendingRegistration?.termsConsent ? { termsConsent: "true" } : {}),
      }));
      if (res?.error) {
        throw new Error(`NextAuth: ${res.error}`);
      }

      if (pendingRegistration && shouldRunRegistrationFallback) {
        await applyRegistrationFallback(pendingRegistration, effectiveRoleIntent).catch((fallbackErr) => {
          console.error("[CALLBACK] Fallback de cadastro OAuth falhou:", fallbackErr);
        });
      }

      clearRoleIntentStorage();
      clearPendingRegistrationStorage();

      const targetPath = pendingRegistration
        ? getRegistrationPath(pendingRegistration)
        : effectiveRoleIntent
          ? await resolveWithTimeout(getPostLoginPath(effectiveRoleIntent), fallbackPathForRoleIntent(effectiveRoleIntent))
          : returnUrl ?? await resolveWithTimeout(getPostLoginPath(effectiveRoleIntent), ACCOUNT_ROUTES.dashboardCliente);

      if (!active) return;
      setSuccess(true);
      setMessage("Acesso confirmado. Redirecionando...");
      window.setTimeout(() => {
        window.location.replace(targetPath);
      }, 600);
    }

    finishAuth().catch(async (err) => {
      if (!active) return;
      const rawMsg: string = err?.message ?? "Nao foi possivel finalizar o acesso.";
      const isCadastroError = retryTarget !== "/login";
      console.error(isCadastroError ? "[CALLBACK] Erro no cadastro Google:" : "[CALLBACK] Erro no login Google:", rawMsg);
      await clearInvalidAuthState();
      setMessage(isCadastroError
        ? "Não foi possível concluir o cadastro. Tente novamente ou use outro método."
        : "Não foi possível concluir o login. Tente novamente ou use outro método.");
      setErrorDetail("Confira sua conexão e tente novamente. Se continuar, use outro método de acesso.");
    });

    return () => {
      active = false;
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
