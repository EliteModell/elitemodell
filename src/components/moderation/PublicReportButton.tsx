"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

const reasons = [
  ["POSSIBLE_MINOR", "Possivel menor de idade"],
  ["EXPLOITATION_COERCION", "Exploracao ou coercao"],
  ["HUMAN_TRAFFICKING", "Trafico de pessoas"],
  ["PHYSICAL_RISK", "Risco fisico"],
  ["UNAUTHORIZED_IMAGE", "Imagem nao autorizada"],
  ["FAKE_PROFILE", "Perfil falso"],
  ["FRAUD_SCAM", "Fraude ou golpe"],
  ["ILLEGAL_CONTENT", "Conteudo ilegal"],
  ["OTHER", "Outro"],
] as const;

export default function PublicReportButton({ targetType, targetId, initialOpen = false }: { targetType: "PROFESSIONAL" | "PROPERTY" | "PHOTO" | "VIDEO" | "STORY" | "CONTENT"; targetId: string; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("POSSIBLE_MINOR");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    const response = await fetch("/api/moderation/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, description }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      setResult("Nao foi possivel enviar. Revise a descricao e tente novamente.");
      return;
    }
    setResult(`Protocolo: ${data.protocol}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-bold text-red-300 underline">
        <Flag size={16} /> Denunciar
      </button>
      {open ? (
        <div className="fixed inset-0 z-[300] grid place-items-center bg-black/80 p-4">
          <section className="w-full max-w-lg rounded-[8px] border border-red-400/30 bg-[#101012] p-5 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Denunciar conteudo</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="border-0 bg-transparent text-white"><X /></button>
            </div>
            <p className="mt-2 text-sm text-white/60">Possivel menor, coercao, exploracao, trafico ou risco fisico recebem prioridade maxima.</p>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              Motivo
              <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="rounded-[8px] border border-white/15 bg-black p-3">
                {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="mt-3 grid gap-2 text-sm font-bold">
              Descricao
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={2000} className="min-h-28 rounded-[8px] border border-white/15 bg-black p-3" />
            </label>
            {result ? <p className="mt-3 text-sm text-[#f5d78c]">{result}</p> : null}
            <button type="button" disabled={sending || description.trim().length < 20} onClick={submit} className="mt-4 min-h-11 rounded-[8px] bg-red-500 px-4 font-black text-white disabled:opacity-50">
              {sending ? "Enviando..." : "Enviar denuncia"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
