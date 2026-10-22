"use client";

import { useEffect, useState } from "react";
import { professionalDraftStorageKey } from "@/lib/professional-draft-storage";

type Diagnostic = {
  generatedAt: string;
  session: { userId: string; email: string; phone: string; phoneVerified: boolean; emailVerified: boolean; accountType: string; normalizedPhoneOwnerCount: number; sessionOwnsNormalizedPhone: boolean };
  professional: null | { id: string; status: string; completionRulesVersion: number; registrationSubmittedAt: string | null; updatedAt: string; fields: { displayName: { value: string | null }; city: { value: string | null } } };
  serverDraft: { storage: string; separateDraftRecord: boolean; ownerId: string };
};

export default function OnboardingDiagnostic({ userId, displayedName, displayedCity }: { userId: string; displayedName: string; displayedCity: string }) {
  const [enabled] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("diagnostico") === "1");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [localDraft, setLocalDraft] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/professionals/onboarding-diagnostic", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then(setDiagnostic)
      .catch(() => setDiagnostic(null));
    try {
      const raw = localStorage.getItem(professionalDraftStorageKey(userId));
      window.setTimeout(() => setLocalDraft(raw ? JSON.parse(raw) as Record<string, unknown> : null), 0);
    } catch {
      window.setTimeout(() => setLocalDraft(null), 0);
    }
  }, [enabled, userId]);

  if (!enabled) return null;
  const localForm = localDraft?.form && typeof localDraft.form === "object" ? localDraft.form as Record<string, unknown> : null;
  const sources = (field: "displayName" | "city", displayed: string) => {
    const found: string[] = [];
    if (diagnostic?.professional?.fields[field].value === displayed) found.push(`banco:Professional.${field}`);
    if (localForm?.[field] === displayed) found.push("localStorage individual");
    return found.length ? found.join(" + ") : "estado React ainda nao persistido";
  };

  return (
    <aside style={{ marginBottom: 20, padding: 14, border: "2px solid #2563eb", borderRadius: 12, background: "#eff6ff", color: "#172554", fontSize: 12, lineHeight: 1.55 }}>
      <strong>Diagnostico temporario do cadastro (somente esta conta)</strong>
      {!diagnostic ? <p>Carregando identidade validada no servidor...</p> : <>
        <p>Sessao User.id: <code>{diagnostic.session.userId}</code><br />E-mail: {diagnostic.session.email}; telefone: {diagnostic.session.phone}<br />Donos encontrados para o telefone normalizado: {diagnostic.session.normalizedPhoneOwnerCount}; esta sessao e dona: {diagnostic.session.sessionOwnsNormalizedPhone ? "sim" : "nao"}</p>
        <p>Professional.id: <code>{diagnostic.professional?.id ?? "nao existe"}</code>; status: {diagnostic.professional?.status ?? "sem perfil"}; regra: {diagnostic.professional?.completionRulesVersion ?? "-"}</p>
        <p>Nome exibido: <code>{displayedName || "vazio"}</code> — origem coincidente: {sources("displayName", displayedName)}<br />Cidade exibida: <code>{displayedCity || "vazia"}</code> — origem coincidente: {sources("city", displayedCity)}</p>
        <p>Rascunho servidor: {diagnostic.serverDraft.storage} (registro separado: nao), owner: <code>{diagnostic.serverDraft.ownerId}</code><br />Rascunho local: {localDraft ? "presente" : "ausente"}; owner: <code>{String(localDraft?.ownerId ?? "-")}</code>; etapa: {String(localDraft?.step ?? "-")}; atualizado: {String(localDraft?.updatedAt ?? "-")}</p>
      </>}
    </aside>
  );
}
