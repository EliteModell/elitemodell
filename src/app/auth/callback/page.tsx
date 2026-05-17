"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-client";

type PendingRegistration = {
  accountType?: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
};

const PROPERTY_DRAFT_KEY = "elitemodell_property_draft_v1";
const PROPERTY_DRAFT_FINAL_PATH = "/anfitriao/imoveis/novo?finalizar=1";

function hasPropertyDraft() {
  return Boolean(localStorage.getItem(PROPERTY_DRAFT_KEY));
}

async function getPostLoginPath() {
  if (hasPropertyDraft()) return PROPERTY_DRAFT_FINAL_PATH;

  const res = await fetch("/api/users/me");
  if (!res.ok) return "/dashboard";

  const user = await res.json();
  if (user.role === "HOST" && !user.professional) return "/profissional/novo";
  return "/dashboard";
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
      if (!accessToken) throw new Error("Sessao Supabase nao encontrada.");

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
      if (res?.error) throw new Error("Conta nao encontrada. Cadastre-se antes de entrar.");

      if (!active) return;
      setMessage("Acesso confirmado.");
      router.replace(
        pendingRegistration ? getRegistrationPath(pendingRegistration) : await getPostLoginPath()
      );
      router.refresh();
    }

    finishAuth().catch((err) => {
      if (!active) return;
      setMessage(err?.message ?? "Nao foi possivel finalizar o acesso.");
      setTimeout(() => router.replace("/login"), 1800);
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#060e1b", color: "#f1f5f9", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 14, padding: 28, textAlign: "center" }}>
        <p style={{ color: "#d4a843", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 10px" }}>EliteModell</p>
        <h1 style={{ fontSize: 18, margin: 0 }}>{message}</h1>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#060e1b", color: "#f1f5f9", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 14, padding: 28, textAlign: "center" }}>
          <p style={{ color: "#d4a843", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 10px" }}>EliteModell</p>
          <h1 style={{ fontSize: 18, margin: 0 }}>Finalizando acesso seguro...</h1>
        </div>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
