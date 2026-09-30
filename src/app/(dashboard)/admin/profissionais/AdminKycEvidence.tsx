"use client";
/* eslint-disable @next/next/no-img-element -- signed private evidence URLs are short lived and cannot use the image optimizer. */

import { useState } from "react";

type DiditResult = {
  sessionId: string;
  status: string;
  environment: string | null;
  approved: boolean;
  reason: string | null;
  documents: Array<{
    nodeId: string; status: string; documentType: string | null; fullName: string | null;
    dateOfBirth: string | null; expirationDate: string | null;
    warnings: Array<{ description: string; type: string | null }>;
  }>;
  liveness: Array<{ nodeId: string; status: string; score: number | null; ageEstimation: number | null }>;
  faceMatch: { status: string; detail: string };
  mediaAvailability: { document: boolean; selfie: boolean; detail: string };
};

type Evidence = { label: string; path: string };

export function AdminKycEvidence({
  professionalId,
  provider,
  sessionId,
  evidence,
}: {
  professionalId: string;
  provider: string | null;
  sessionId: string | null;
  evidence: Evidence[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);
  const [didit, setDidit] = useState<DiditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openEvidence(item: Evidence) {
    setBusy(item.label);
    setError(null);
    try {
      const query = new URLSearchParams({ professionalId, path: item.path });
      const response = await fetch(`/api/admin/documento?${query}`, { cache: "no-store" });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível abrir a evidência.");
      setPreview({ label: item.label, url: data.url });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a evidência.");
    } finally {
      setBusy(null);
    }
  }

  async function loadDidit() {
    setBusy("didit");
    setError(null);
    try {
      const response = await fetch(`/api/admin/professionals/${professionalId}/didit`, { cache: "no-store" });
      const data = await response.json() as DiditResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar a Didit.");
      setDidit(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar a Didit.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-kyc-evidence">
      {evidence.length > 0 && (
        <>
          <p className="pro-subtitle">Evidências privadas existentes</p>
          <div className="admin-evidence-actions">
            {evidence.map((item) => (
              <button type="button" key={`${item.label}:${item.path}`} onClick={() => openEvidence(item)} disabled={Boolean(busy)}>
                {busy === item.label ? "Abrindo…" : `Abrir ${item.label}`}
              </button>
            ))}
          </div>
        </>
      )}

      {provider === "DIDIT" && sessionId && (
        <>
          <button type="button" className="admin-didit-load" onClick={loadDidit} disabled={Boolean(busy)}>
            {busy === "didit" ? "Consultando Didit…" : didit ? "Atualizar decisão Didit" : "Carregar decisão detalhada Didit"}
          </button>
          {didit && (
            <div className="admin-didit-result">
              <div className={didit.approved ? "didit-decision ok" : "didit-decision bad"}>
                <strong>Resultado geral: {didit.status}</strong>
                <span>Ambiente: {didit.environment ?? "não informado"}</span>
                {didit.reason && <span>{didit.reason}</span>}
              </div>
              {didit.documents.map((document) => (
                <div className="didit-block" key={document.nodeId}>
                  <b>Documento · {document.status}</b>
                  <span>Tipo: {document.documentType ?? "não informado"}</span>
                  <span>Nome no documento: {document.fullName ?? "não informado"}</span>
                  <span>Nascimento: {document.dateOfBirth ?? "não informado"}</span>
                  <span>Validade: {document.expirationDate ?? "não informada"}</span>
                  {document.warnings.map((warning, index) => <em key={`${warning.description}:${index}`}>⚠ {warning.description}</em>)}
                </div>
              ))}
              {didit.liveness.length ? didit.liveness.map((check) => (
                <div className="didit-block" key={check.nodeId}>
                  <b>Prova de vida · {check.status}</b>
                  <span>Score: {check.score ?? "não informado"}</span>
                  <span>Estimativa de idade: {check.ageEstimation ?? "não informada"}</span>
                </div>
              )) : <div className="didit-block"><b>Prova de vida</b><span>Nenhum resultado separado retornado.</span></div>}
              <div className="didit-block"><b>Face Match</b><span>{didit.faceMatch.detail}</span></div>
              <div className="didit-block"><b>Imagens Didit</b><span>{didit.mediaAvailability.detail}</span></div>
            </div>
          )}
        </>
      )}

      {error && <p className="admin-evidence-error" role="alert">{error}</p>}
      {preview && (
        <div className="admin-evidence-modal" role="dialog" aria-modal="true" aria-label={preview.label} onClick={() => setPreview(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <header><strong>{preview.label}</strong><button type="button" onClick={() => setPreview(null)} aria-label="Fechar">×</button></header>
            <img src={preview.url} alt={preview.label} />
            <a href={preview.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>
          </div>
        </div>
      )}
    </div>
  );
}
