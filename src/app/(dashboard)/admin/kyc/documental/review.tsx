"use client";

import { useState } from "react";
import { confirmedAdult } from "@/lib/manual-identity-policy";
import { useRouter } from "next/navigation";

export default function Review({ id, version, demoReview }: { id: string; version: number; demoReview?: (status: string, reason: string) => void }) {
  const router = useRouter();
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return <form key={version} className="mt-4 grid max-w-xl gap-3" onSubmit={async (event) => {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    if (!window.confirm("Confirma o registro desta decisão de identidade?")) return;
    setSaving(true);
    setMessage("");
    try {
      if (demoReview) {
        if (status === "APPROVED" && (!confirmedAdult(String(form.get("birth"))) || !["document", "portrait", "challenge"].every((check) => form.has(check)))) {
          throw new Error("Confirme a maioridade e todas as evidências fictícias.");
        }
        demoReview(status, String(form.get("reason")));
        setMessage("Decisão simulada registrada.");
        return;
      }
      const response = await fetch("/api/admin/kyc/manual", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, version, status, reason: form.get("reason"), birth: form.get("birth"), confirmed: true,
          checks: { document: form.has("document"), portrait: form.has("portrait"), challenge: form.has("challenge") } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a decisão.");
      setMessage("Decisão registrada.");
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }}>
    <label>Decisão <select className="border p-2" value={status} onChange={(event) => setStatus(event.target.value)}>
      <option value="PENDING_REVIEW">Manter em análise</option>
      <option value="APPROVED">Aprovar</option>
      <option value="REJECTED">Reprovar</option>
      <option value="RESUBMISSION_REQUESTED">Solicitar novo envio</option>
    </select></label>
    {status === "APPROVED" && <fieldset className="grid gap-2">
      <legend>Conferência obrigatória</legend>
      <label>Nascimento conferido no documento <input type="date" name="birth" required /></label>
      <label><input type="checkbox" name="document" required /> Documento elegível, válido, legível e completo</label>
      <label><input type="checkbox" name="portrait" required /> Correspondência visual conferida entre rosto e documento</label>
      <label><input type="checkbox" name="challenge" required /> Documento e papel com frase e data do desafio conferidos</label>
    </fieldset>}
    <label>Observações internas e motivo <textarea className="block w-full border p-2" name="reason" required minLength={5} maxLength={1000} placeholder="Registre a conclusão sem incluir números de documentos." /></label>
    <button className="min-h-11 rounded border px-4" type="submit" disabled={saving}>{saving ? "Salvando…" : "Confirmar decisão"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
