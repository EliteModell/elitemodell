"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { demoEvidence, demoStorageKey } from "../fixtures";
import { identityParts, type IdentityPart } from "../policy";
import Review from "./review";
import styles from "../demo.module.css";

type Attempt = { id: string; name: string; documentType: string; status: string; backUnavailable: boolean; date: string; reason?: string; version?: number; variants?: Partial<Record<IdentityPart, number>> };
const examples: Attempt[] = [
  { id: "demo-ana", name: "Ana Exemplo", documentType: "CIN", status: "PENDING_REVIEW", backUnavailable: false, date: "2026-11-20" },
  { id: "demo-clara", name: "Clara Exemplo", documentType: "CNH", status: "RESUBMISSION_REQUESTED", backUnavailable: true, date: "2026-11-19", reason: "Imagem desfocada na amostra." },
];
const labels: Record<string, string> = { PENDING_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Reprovado", RESUBMISSION_REQUESTED: "Novo envio solicitado" };
const parts = { front: "Frente", back: "Verso", portrait: "Foto segurando o documento" };
function snapshot() { return localStorage.getItem(demoStorageKey) ?? "[]"; }
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(demoStorageKey, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(demoStorageKey, listener);
  };
}

export default function Queue() {
  const data = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved = JSON.parse(data) as Attempt[];
  const attempts = [...saved, ...examples.filter(({ id }) => !saved.some((item) => item.id === id))];
  return <main className={styles.shell}>
    <nav className={styles.nav}><strong>ELITE MODELL</strong><Link href="/demo-identidade">Fluxo da profissional</Link></nav>
    <div className={styles.queue}>
      <h1>Verificação documental manual</h1>
      <p>Demonstração administrativa. As decisões e solicitações são fictícias.</p>
      {attempts.map((attempt) => <article key={attempt.id} className={styles.panel}>
        <h2>{attempt.name} · {attempt.documentType}</h2>
        <p className={styles.status}>{labels[attempt.status]}</p>
        <p>Envio em {attempt.date.split("-").reverse().join("/")} · Nascimento fictício: 04/07/1997</p>
        {attempt.reason && <p>Observação: {attempt.reason}</p>}
        <details><summary>Ver evidências fictícias</summary>
          <div className={styles.evidence}>{identityParts(attempt.backUnavailable).map((part) => <figure key={part}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demoEvidence(part, attempt.variants?.[part] ?? 0, attempt.date.split("-").reverse().join("/"))} alt={parts[part]} />
            <figcaption>{parts[part]}</figcaption>
          </figure>)}</div>
        </details>
        {attempt.status === "PENDING_REVIEW" && <Review version={attempt.version ?? 0} demoReview={(status, reason) => {
          const updated = { ...attempt, status, reason, version: (attempt.version ?? 0) + 1 };
          localStorage.setItem(demoStorageKey, JSON.stringify([updated, ...saved.filter((item) => item.id !== attempt.id)]));
          window.dispatchEvent(new Event(demoStorageKey));
        }} />}
      </article>)}
      <button className={styles.reset} type="button" onClick={() => {
        localStorage.removeItem(demoStorageKey);
        window.dispatchEvent(new Event(demoStorageKey));
      }}>Restaurar exemplos da demonstração</button>
    </div>
  </main>;
}
