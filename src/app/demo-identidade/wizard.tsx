"use client";

import Link from "next/link";
import { useState } from "react";
import { demoEvidence, demoStorageKey } from "./fixtures";
import { brazilDate, IDENTITY_DOCUMENTS, IDENTITY_RETENTION_DAYS, type IdentityPart } from "./policy";
import styles from "./wizard.module.css";

const steps = [
  { title: "Verso do documento", part: "back", help: "Enquadre o verso inteiro. Use uma superfície plana e evite reflexos." },
  { title: "Frente do documento", part: "front", help: "Capture todos os cantos, com boa iluminação e dados legíveis." },
  { title: "Foto segurando o documento", part: "portrait", help: "Mostre seu rosto, o documento e o papel sem cobrir informações. Esta foto serve à análise humana." },
] as const;

const labels: Record<string, string> = {
  PENDING_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Reprovado", RESUBMISSION_REQUESTED: "Novo envio solicitado",
};

export default function ManualIdentityWizard() {
  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState("");
  const [backUnavailable, setBackUnavailable] = useState(false);
  const [notice, setNotice] = useState(false);
  const [date] = useState(brazilDate);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [sample, setSample] = useState(0);
  const [variants, setVariants] = useState<Partial<Record<IdentityPart, number>>>({});
  const [error, setError] = useState("");
  const active = steps[step];
  const photo = active && variants[active.part];
  const locked = status === "APPROVED" || status === "PENDING_REVIEW";
  function samplePhoto(part: IdentityPart) {
    const variant = sample + 1;
    setSample(variant);
    setVariants((previous) => ({ ...previous, [part]: variant }));
  }

  function send() {
    if (!notice || !variants.front || !variants.portrait || (!backUnavailable && !variants.back)) return;
    setError("");
    try {
      const saved = JSON.parse(localStorage.getItem(demoStorageKey) ?? "[]");
      const attempt = { id: crypto.randomUUID(), name: "Profissional de demonstração", documentType,
        backUnavailable, date, variants, status: "PENDING_REVIEW" };
      localStorage.setItem(demoStorageKey, JSON.stringify([attempt, ...saved]));
      setStatus(attempt.status);
      setSent(true);
    } catch {
      setError("O navegador não conseguiu salvar a simulação.");
    }
  }

  return <main className={styles.shell}>
    <section className={styles.card}>
      <h1>Verificação de identidade</h1>
      <p className={styles.status}>Demonstração administrativa · use as capturas fictícias da interface.</p>
      {locked || sent ? <>
        <strong className={styles.status}>{labels[status] ?? status}</strong>
        {status === "PENDING_REVIEW" && <><h2>Envio fictício concluído</h2>
          <p>Veja a solicitação no <Link href="/demo-identidade/admin">painel de revisão</Link> ou <button type="button" onClick={() => { setStep(0); setDocumentType(""); setBackUnavailable(false); setVariants({}); setNotice(false); setStatus(""); setSent(false); }}>Recomeçar demonstração</button>.</p></>}
      </> : <>
        {status && <p className={styles.status}>{labels[status]}</p>}
        <progress value={step + 1} max={4} aria-label={`Etapa ${step + 1} de 4`} />
        <p>Etapa {step + 1} de 4</p>
        <h2>{active?.title ?? "Enviar para análise"}</h2>
        {step === 0 && <>
          <label>Tipo de documento
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              <option value="">Selecione</option>
              {IDENTITY_DOCUMENTS.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className={styles.check}><input type="checkbox" checked={backUnavailable} onChange={(event) => setBackUnavailable(event.target.checked)} /> Meu documento digital não possui verso separado</label>
        </>}
        {active && !(step === 0 && backUnavailable) && <>
          <p>{active.help}</p>
          {step === 2 && <p>Escreva no papel <strong>Verificação ELITE MODELL</strong> e a data <strong>{date.split("-").reverse().join("/")}</strong>.</p>}
          <div className={styles.frame}>{photo ?
            // eslint-disable-next-line @next/next/no-img-element
            <img src={demoEvidence(active.part, photo, date.split("-").reverse().join("/"))} alt="Confira o enquadramento e a nitidez da foto" /> :
            <span>Inclua toda a imagem dentro do quadro</span>}</div>
          <button type="button" onClick={() => samplePhoto(active.part)}>{photo ? "Refazer foto fictícia" : "Simular captura"}</button>
        </>}
        {!active && <div className={styles.notice}>
          <p>Usaremos estas fotos exclusivamente para verificar sua identidade e maioridade. Apenas revisores autorizados podem acessá-las. O prazo previsto para as fotos enviadas é de até {IDENTITY_RETENTION_DAYS} dias. A decisão e a auditoria têm retenção própria.</p>
          <p>Nesta demonstração, apenas o resultado fictício fica neste navegador.</p>
          <label className={styles.check}><input type="checkbox" checked={notice} onChange={(event) => setNotice(event.target.checked)} /> Li o aviso de privacidade.</label>
        </div>}
        <div className={styles.actions}>
          {step > 0 && <button type="button" className={styles.secondary} onClick={() => setStep(step - 1)}>Voltar</button>}
          {active ? <button type="button" disabled={(step === 0 && !documentType) || (!photo && !(step === 0 && backUnavailable))} onClick={() => setStep(step + 1)}>Continuar</button>
            : <button type="button" disabled={!notice} onClick={send}>Enviar para análise</button>}
        </div>
      </>}
      {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
