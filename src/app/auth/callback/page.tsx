"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES, postLoginPathFromUser } from "@/lib/account-routes";

type PendingRegistration = {
  accountType?: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
};

const PROPERTY_DRAFT_KEY = "elitemodell_property_draft_v1";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;
const CALLBACK_TIMEOUT_MS = 1800;
const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

function hasPropertyDraft() {
  return Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));
}

const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"];

async function getPostLoginPath() {
  const res = await fetch("/api/users/me", { cache: "no-store" });
  if (!res.ok) return ACCOUNT_ROUTES.painelCliente;

  const user = await res.json();
  const isProfessional = PROFESSIONAL_CATEGORIES.includes(user.category);

  if (user.role === "HOST" && isProfessional) {
    if (!user.professional) return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (user.professional.status === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
    return postLoginPathFromUser(user);
  }

  if (user.role === "HOST" && hasPropertyDraft()) return PROPERTY_DRAFT_FINAL_PATH;

  return postLoginPathFromUser(user);
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
  return ACCOUNT_ROUTES.painelCliente;
}

function CallbackCard({ message, success }: { message: string; success?: boolean }) {
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
        maxWidth: 380,
        background: "rgba(10,10,10,0.96)",
        border: "1px solid rgba(212,168,67,0.28)",
        borderRadius: 16,
        padding: "40px 32px 36px",
        textAlign: "center",
        position: "relative",
        animation: "em-fadein 0.4s ease",
        boxShadow: "0 0 60px rgba(212,168,67,0.06), 0 20px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Gold line */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 2,
          borderRadius: "16px 16px 0 0",
          background: "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)",
        }} />

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.5px" }}>
            <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </div>

        {/* Spinner */}
        {!success && (
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
          color: "#cbd5e1",
          fontSize: 15,
          fontWeight: 500,
          margin: 0,
          lineHeight: 1.5,
          animation: "em-pulse 2s ease-in-out infinite",
        }}>
          {message}
        </p>

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

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabaseAuth.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const accessToken = await waitForSession();
      if (!accessToken) throw new Error("Sessão não encontrada. Tente novamente.");

      if (active) setMessage("Configurando sua conta...");

      const pendingRaw = sessionStorage.getItem("elitemodell_pending_registration");
      let pendingRegistration: PendingRegistration | null = null;
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as PendingRegistration;
        pendingRegistration = pending;
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, ...pending }),
        });
        if (!regRes.ok) {
          const payload = await regRes.json().catch(() => ({}));
          throw new Error(typeof payload.error === "string" ? payload.error : "Erro ao criar conta.");
        }
        sessionStorage.removeItem("elitemodell_pending_registration");
      }

      const res = await signIn("supabase", { accessToken, redirect: false });
      if (res?.error) throw new Error("Conta não encontrada. Cadastre-se antes de entrar.");

      const targetPath = pendingRegistration
        ? getRegistrationPath(pendingRegistration)
        : await resolveWithTimeout(getPostLoginPath(), ACCOUNT_ROUTES.painelCliente);

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
      setMessage(err?.message ?? "Não foi possível finalizar o acesso.");
      setTimeout(() => router.replace(ACCOUNT_ROUTES.login), 1800);
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return <CallbackCard message={message} success={success} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard message="Carregando..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
