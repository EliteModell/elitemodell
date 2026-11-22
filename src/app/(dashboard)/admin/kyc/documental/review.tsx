"use client";

import { useState } from "react";
import { confirmedAdult, IDENTITY_CORRECTION_REASONS } from "@/lib/manual-identity-policy";
import { useRouter } from "next/navigation";

const decisionLabels: Record<string, string> = {
  APPROVED: "Aprovar identidade",
  REJECTED: "Reprovar",
  RESUBMISSION_REQUESTED: "Solicitar novo envio",
  PENDING_REVIEW: "Manter em análise",
};

export default function Review({ id, version, demoReview }: { id: string; version: number; demoReview?: (status: string, reason: string) => void }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return <form key={version} className="mt-4 grid max-w-xl gap-3" onSubmit={async (event) => {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const decision = String(form.get("decision") ?? "");
    if (!Object.hasOwn(decisionLabels, decision)) {
      setMessage("Selecione a decisão que deseja registrar.");
      return;
    }
    if (!window.confirm(`Confirma: ${decisionLabels[decision]}?`)) return;
    setSaving(true);
    setMessage("");
    try {
      if (demoReview) {
        if (decision === "APPROVED" && (!confirmedAdult(String(form.get("birth"))) || !["document", "portrait", "challenge"].every((check) => form.has(check)))) {
          throw new Error("Confirme a maioridade e todas as evidências fictícias.");
        }
        demoReview(decision, String(form.get("reason")));
        setMessage("Decisão simulada registrada.");
        return;
      }
      const response = await fetch("/api/admin/kyc/manual", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, version, status: decision, reason: form.get("reason"), birth: form.get("birth"), correction: form.get("correction"), confirmed: true,
          checks: { document: form.has("document"), portrait: form.has("portrait"), challenge: form.has("challenge") } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a decisão.");
      if (data.status !== decision) throw new Error("A resposta não confirmou a decisão. Consulte o histórico antes de tentar novamente.");
      setMessage(decision === "APPROVED" ? "Identidade aprovada." : `Decisão registrada: ${decisionLabels[decision]}.`);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }}>
    <label>Decisão <select name="decision" required className="border p-2" value={status} onChange={(event) => { setStatus(event.target.value); setMessage(""); }}>
      <option value="" disabled>Selecione uma decisão</option>
      {Object.entries(decisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {status === "APPROVED" && <fieldset className="grid gap-2">
      <legend>Conferência obrigatória</legend>
      <label>Nascimento conferido no documento (18 anos ou mais) <input type="date" name="birth" required /></label>
      <label><input type="checkbox" name="document" required /> Documento elegível, válido, legível e completo</label>
      <label><input type="checkbox" name="portrait" required /> Correspondência visual conferida entre rosto e documento</label>
      <label><input type="checkbox" name="challenge" required /> Documento e papel com frase e data do desafio conferidos</label>
    </fieldset>}
    {["REJECTED", "RESUBMISSION_REQUESTED"].includes(status) && <label>
      Orientação para a profissional
      <select name="correction" required className="block w-full border p-2">
        <option value="">Selecione a pendência</option>
        {Object.entries(IDENTITY_CORRECTION_REASONS).map(([key, message]) => <option key={key} value={key}>{message}</option>)}
      </select>
    </label>}
    <label>Observações internas e motivo <textarea className="block w-full border p-2" name="reason" required minLength={5} maxLength={1000} placeholder="Registre a conclusão sem incluir números de documentos." /></label>
    <button className="min-h-11 rounded border px-4" type="submit" disabled={saving}>{saving ? "Salvando…" : decisionLabels[status] ?? "Confirmar decisão"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
