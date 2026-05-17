"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";

type PendingRegistration = {
  accountType?: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
};

const PROPERTY_DRAFT_KEY = "elitemodell_property_draft_v1";
const PROPERTY_DRAFT_FINAL_PATH = "/anfitriao/imoveis/novo";
const CALLBACK_TIMEOUT_MS = 1800;

function hasPropertyDraft() {
  return Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));
}

const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"];

async function getPostLoginPath() {
  const res = await fetch("/api/users/me", { cache: "no-store" });
  if (!res.ok) return "/dashboard";

  const user = await res.json();
  const isProfessional = PROFESSIONAL_CATEGORIES.includes(user.category);

  if (user.role === "HOST" && isProfessional) {
    // Sem perfil criado → começar onboarding
    if (!user.professional) return "/profissional/novo";
    // Perfil incompleto (DRAFT) → retomar onboarding
    if (user.professional.status === "DRAFT") return "/profissional/novo";
    // Perfil em revisão ou ativo → dashboard
    return "/dashboard";
  }

  // Host de imóveis → verificar rascunho de propriedade
  if (user.role === "HOST" && hasPropertyDraft()) return PROPERTY_DRAFT_FINAL_PATH;

  return "/dashboard";
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
  if (pending?.accountType === "PROFESSIONAL") return "/profissional/novo";
  if (pending?.accountType === "PROPERTY_HOST") {
    return hasPropertyDraft() ? PROPERTY_DRAFT_FINAL_PATH : "/anfitriao";
  }
  return "/dashboard";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finalizando acesso seguro...");

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabaseAuth.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const { data } = await supabaseAuth.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessão Supabase não encontrada.");

      const pendingRaw = sessionStorage.getItem("elitemodell_pending_registration");
      let pendingRegistration: PendingRegistration | null = null;
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as PendingRegistration;
        pendingRegistration = pending;
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, ...pending }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(typeof payload.error === "string" ? payload.error : "Erro ao criar conta.");
        }
        sessionStorage.removeItem("elitemodell_pending_registration");
      }

      const res = await signIn("supabase", { accessToken, redirect: false });
      if (res?.error) throw new Error("Conta não encontrada. Cadastre-se antes de entrar.");

      const targetPath = pendingRegistration
        ? getRegistrationPath(pendingRegistration)
        : await resolveWithTimeout(getPostLoginPath(), "/dashboard");

      if (!active) return;
      setMessage("Acesso confirmado. Redirecionando...");
      router.replace(targetPath);
      window.setTimeout(() => router.refresh(), 120);
    }

    finishAuth().catch((err) => {
      if (!active) return;
      setMessage(err?.message ?? "Não foi possível finalizar o acesso.");
      setTimeout(() => router.replace("/login"), 1200);
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050505", color: "#f4f1ea", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#0c0c0c", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 14, padding: 28, textAlign: "center" }}>
        <p style={{ color: "#d4a843", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 10px" }}>EliteModell</p>
        <h1 style={{ fontSize: 18, margin: 0 }}>{message}</h1>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050505", color: "#f4f1ea", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#0c0c0c", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 14, padding: 28, textAlign: "center" }}>
          <p style={{ color: "#d4a843", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 10px" }}>EliteModell</p>
          <h1 style={{ fontSize: 18, margin: 0 }}>Finalizando acesso seguro...</h1>
        </div>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
