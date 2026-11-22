"use client";

import { useEffect, useRef, useState } from "react";
import { IDENTITY_DOCUMENTS, IDENTITY_NOTICE_VERSION, IDENTITY_RETENTION_DAYS, MAX_IDENTITY_IMAGE, type IdentityPart } from "@/lib/manual-identity-policy";
import Camera from "./camera";
import styles from "./wizard.module.css";

const endpoint = "/api/kyc/manual";
const steps = [
  { title: "Verso do documento", part: "back", help: "Enquadre o verso inteiro. Use uma superfície plana e evite reflexos." },
  { title: "Frente do documento", part: "front", help: "Capture todos os cantos, com boa iluminação e dados legíveis." },
  { title: "Foto segurando o documento", part: "portrait", help: "Mostre seu rosto, o documento e o papel sem cobrir informações. Esta foto serve à análise humana." },
] as const;

const labels: Record<string, string> = {
  PENDING_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Reprovado", RESUBMISSION_REQUESTED: "Novo envio solicitado",
};

async function preparePhoto(file: File) {
  if (file.size > 20_000_000) throw new Error();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (Math.min(image.width, image.height) < 480) throw new Error();
    const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    if (Math.min(canvas.width, canvas.height) < 480) throw new Error();
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.7]) {
      const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (photo && photo.size <= MAX_IDENTITY_IMAGE) return photo;
    }
    throw new Error();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Preview({ photo }: { photo: Blob }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(photo);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt="Confira o enquadramento e a nitidez da foto" />;
}

export default function ManualIdentityWizard() {
  const [showCamera, setShowCamera] = useState(false);
  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState("");
  const [backUnavailable, setBackUnavailable] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<IdentityPart, Blob>>>({});
  const [notice, setNotice] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      setDate(data.challengeDate);
      setStatus(data.verified ? "APPROVED" : data.attempt?.status ?? "");
    }).catch(() => { if (!controller.signal.aborted) setError("Não foi possível consultar a verificação. Confira sua conexão e sessão."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reload]);

  const active = steps[step];
  const photo = active && photos[active.part];
  const locked = status === "APPROVED" || status === "PENDING_REVIEW";
  async function savePhoto(file: File, part: IdentityPart) {
    setShowCamera(false);
    setBusy(true);
    setError("");
    try {
      const image = await preparePhoto(file);
      setRequestId("");
      setPhotos((previous) => ({ ...previous, [part]: image }));
    } catch { setError("Não foi possível ler a foto. Capture novamente, de preferência em JPEG."); }
    finally { setBusy(false); }
  }

  async function send() {
    if (busy || !notice) return;
    setBusy(true);
    setError("");
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    const form = new FormData();
    form.set("requestId", id);
    form.set("documentType", documentType);
    form.set("backUnavailable", String(backUnavailable));
    form.set("challengeDate", date);
    form.set("notice", IDENTITY_NOTICE_VERSION);
    for (const [part, image] of Object.entries(photos)) {
      if (part !== "back" || !backUnavailable) form.set(part, image, part + ".jpg");
    }
    try {
      const response = await fetch(endpoint, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar os documentos.");
      setStatus(data.attempt.status);
      setSent(true);
      setPhotos({});
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Falha de conexão. Tente novamente com as mesmas fotos.");
    } finally { setBusy(false); }
  }

  return <main className={styles.shell}>
    <section className={styles.card}>
      <h1>Verificação de identidade</h1>
      {locked || sent ? <>
        <strong className={styles.status}>{labels[status] ?? status}</strong>
        <p><a href="/profissional/novo">Voltar ao cadastro profissional</a></p>
        {status === "PENDING_REVIEW" && <><h2>Seus documentos foram enviados com segurança</h2>
          <p>Nossa equipe irá analisar sua identidade. Consulte esta página para acompanhar a decisão.</p></>}
      </> : <>
        {status && <p className={styles.status}>{labels[status]}</p>}
        <progress value={step + 1} max={4} aria-label={`Etapa ${step + 1} de 4`} />
        <p>Etapa {step + 1} de 4</p>
        <h2>{active?.title ?? "Enviar para análise"}</h2>
        {step === 0 && <>
          <label>Tipo de documento
            <select value={documentType} onChange={(event) => { setRequestId(""); setDocumentType(event.target.value); }}>
              <option value="">Selecione</option>
              {IDENTITY_DOCUMENTS.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className={styles.check}><input type="checkbox" checked={backUnavailable} onChange={(event) => { setShowCamera(false); setRequestId(""); setBackUnavailable(event.target.checked); }} /> Meu documento digital não possui verso separado</label>
        </>}
        {active && !(step === 0 && backUnavailable) && <>
          <p>{active.help}</p>
          {step === 2 && <p>Escreva no papel <strong>Verificação ELITE MODELL</strong> e a data <strong>{date.split("-").reverse().join("/")}</strong>.</p>}
          <div className={styles.frame}>{photo ? <Preview photo={photo} /> : <span>Inclua toda a imagem dentro do quadro</span>}</div>
          {showCamera ? <Camera facing={step === 2 ? "user" : "environment"} close={() => setShowCamera(false)}
            onPhoto={(file) => void savePhoto(file, active.part)} /> :
            <button type="button" disabled={busy} onClick={() => setShowCamera(true)}>{photo ? "Refazer foto" : "Abrir câmera"}</button>}
          {!showCamera && <label className={styles.file}>Usar câmera nativa
            <input type="file" accept="image/*" capture={step === 2 ? "user" : "environment"} disabled={busy} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void savePhoto(file, active.part);
            }} />
          </label>}
          {!showCamera && step < 2 && <label className={styles.file}>Selecionar imagem do documento
            <input type="file" accept="image/*" disabled={busy} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void savePhoto(file, active.part);
            }} />
          </label>}
        </>}
        {!active && <div className={styles.notice}>
          <p>Usaremos estas fotos exclusivamente para verificar sua identidade e maioridade. Apenas revisores autorizados podem acessá-las. O prazo previsto para as fotos enviadas é de até {IDENTITY_RETENTION_DAYS} dias. A decisão e a auditoria têm retenção própria.</p>
          <p>Para exercer seus direitos de acesso, correção ou exclusão, consulte a <a href="/privacy">Política de Privacidade</a>.</p>
          <label className={styles.check}><input type="checkbox" checked={notice} onChange={(event) => setNotice(event.target.checked)} /> Li o aviso de privacidade.</label>
        </div>}
        <div className={styles.actions}>
          {step > 0 && <button type="button" className={styles.secondary} disabled={busy || showCamera} onClick={() => setStep(step - 1)}>Voltar</button>}
          {active ? <button type="button" disabled={busy || showCamera || !date || (step === 0 && !documentType) || (!photo && !(step === 0 && backUnavailable))} onClick={() => setStep(step + 1)}>Continuar</button>
            : <button type="button" disabled={busy || !notice} onClick={send}>{busy ? "Enviando…" : "Enviar para análise"}</button>}
        </div>
      </>}
      {error && <p role="alert">{error}</p>}
      {!date && !busy && <button type="button" onClick={() => { setBusy(true); setError(""); setReload(reload + 1); }}>Tentar novamente</button>}
    </section>
  </main>;
}
