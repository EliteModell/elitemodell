"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES, normalizeEntryRole, postLoginPathFromUser } from "@/lib/account-routes";

type PendingRegistration = {
  accountType?: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
};

const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;
const CALLBACK_TIMEOUT_MS = 4000;
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

const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"];

async function getPostLoginPath(roleIntent?: ReturnType<typeof normalizeEntryRole>) {
  const res = await fetch("/api/users/me", { cache: "no-store" });
  if (!res.ok) return ACCOUNT_ROUTES.dashboardCliente;

  const user = await res.json();

  // Usuário sem consentimento ou sem data de nascimento → completar cadastro obrigatório
  if (!user.lgpdConsent || !user.termsConsent || !user.birthDate) {
    return "/completar-cadastro";
  }

  const isProfessional = PROFESSIONAL_CATEGORIES.includes(user.category);

  if (user.role === "HOST" && isProfessional) {
    if (!user.professional) return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (user.professional.status === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
    return postLoginPathFromUser(user, roleIntent);
  }

  if (user.role === "HOST" && hasPropertyDraft()) return PROPERTY_DRAFT_FINAL_PATH;

  return postLoginPathFromUser(user, roleIntent);
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

function getRegistrationPath(pending: PendingRegistration | null) {
  if (pending?.accountType === "PROFESSIONAL") return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (pending?.accountType === "PROPERTY_HOST") {
    return hasPropertyDraft() ? PROPERTY_DRAFT_FINAL_PATH : ACCOUNT_ROUTES.onboardingAnfitriao;
  }
  return ACCOUNT_ROUTES.dashboardCliente;
}

function CallbackCard({ message, success, error }: { message: string; success?: boolean; error?: string }) {
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
              Código do erro
            </p>
            <p style={{ color: "#f87171", fontSize: 13, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>
              {error}
            </p>
          </div>
        )}

        {/* Retry link when error */}
        {error && (
          <a
            href="/login"
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
      else reject(new Error("Sessão não encontrada. Tente novamente."));
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verificando suas credenciais...");
  const [success, setSuccess] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const returnUrl = safeInternalPath(searchParams.get("returnUrl") ?? searchParams.get("redirectTo"));
    const roleIntent = normalizeEntryRole(searchParams.get("role"));

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
          if (!data.session?.access_token) throw new Error("Sessão não encontrada após troca de código.");
          accessToken = data.session.access_token;
        }
      } else {
        accessToken = await waitForSession();
        if (!accessToken) throw new Error("Sessão não encontrada. Tente novamente.");
      }

      if (active) setMessage("Configurando sua conta...");

      const pendingRaw = sessionStorage.getItem("elitemodell_pending_registration");
      let pendingRegistration: PendingRegistration | null = null;
      if (pendingRaw) {
        let pending: PendingRegistration | null = null;
        try {
          const parsed = JSON.parse(pendingRaw) as unknown;
          const validTypes = ["GUEST", "PROFESSIONAL", "PROPERTY_HOST"];
          if (
            parsed &&
            typeof parsed === "object" &&
            (!("accountType" in parsed) || validTypes.includes((parsed as PendingRegistration).accountType ?? ""))
          ) {
            pending = parsed as PendingRegistration;
          }
        } catch {
          // sessionStorage corrompido — ignora silenciosamente
        }

        if (pending) {
          pendingRegistration = pending;
          const regRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, ...pending }),
          });
          if (!regRes.ok) {
            const payload = await regRes.json().catch(() => ({}));
            if (regRes.status !== 200) {
              throw new Error(typeof payload.error === "string" ? payload.error : "Erro ao criar conta.");
            }
          }
          sessionStorage.removeItem("elitemodell_pending_registration");
        }
      }

      const res = await signIn("supabase", { accessToken, redirect: false });
      if (res?.error) {
        throw new Error(`NextAuth: ${res.error}`);
      }

      const targetPath = returnUrl ?? (pendingRegistration
        ? getRegistrationPath(pendingRegistration)
        : await resolveWithTimeout(getPostLoginPath(roleIntent), ACCOUNT_ROUTES.dashboardCliente));

      if (!active) return;
      setSuccess(true);
      setMessage("Acesso confirmado!");
      window.setTimeout(() => {
        router.replace(targetPath);
        window.setTimeout(() => router.refresh(), 120);
      }, 600);
    }

    finishAuth().catch((err) => {
      if (!active) return;
      const msg: string = err?.message ?? "Não foi possível finalizar o acesso.";
      console.error("[CALLBACK] Erro no login Google:", msg);
      setMessage("Erro ao finalizar o acesso");
      setErrorDetail(msg);
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return <CallbackCard message={message} success={success} error={errorDetail} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard message="Carregando..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
