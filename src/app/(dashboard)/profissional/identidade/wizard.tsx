"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera as CameraIcon, Check, ChevronRight, IdCard, ImagePlus, ScanFace, ShieldCheck } from "lucide-react";
import { IDENTITY_DOCUMENTS, IDENTITY_NOTICE_VERSION, IDENTITY_RETENTION_DAYS, MAX_IDENTITY_IMAGE, identityParts, type IdentityPart } from "@/lib/manual-identity-policy";
import Camera from "./camera";
import styles from "./wizard.module.css";

const endpoint = "/api/kyc/manual";
const details: Record<IdentityPart, { title: string; help: string; required: string }> = {
  front: { title: "Frente do documento", help: "Enquadre o documento inteiro, com boa luz e sem reflexos.", required: "Tire ou selecione uma foto da frente do documento." },
  back: { title: "Verso do documento", help: "Mostre todos os cantos e deixe os dados legíveis.", required: "Envie uma foto do verso. Ela é obrigatória quando o documento tem verso separado." },
  portrait: { title: "Selfie com o documento", help: "Mostre seu rosto e segure o documento e o papel sem cobrir as informações.", required: "Tire uma selfie segurando o documento e o papel com a data." },
};

const documentNames = { RG: "Registro Geral", CIN: "Carteira de Identidade Nacional", CNH: "Carteira Nacional de Habilitação" };
const description = "Para garantir a segurança da nossa comunidade, precisamos confirmar sua identidade. Envie as imagens solicitadas para análise da nossa equipe. Seus documentos são privados e não aparecem no seu perfil.";

const labels: Record<string, string> = {
  PENDING_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Reprovado", RESUBMISSION_REQUESTED: "Novo envio solicitado",
};

async function preparePhoto(file: File) {
  if (file.size > 20_000_000) throw new Error("A foto deve ter até 20 MB. Escolha uma imagem menor.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("Não foi possível abrir esta imagem. Tire outra foto ou use JPEG."); });
    if (Math.min(image.width, image.height) < 480) throw new Error("A foto precisa ter pelo menos 480 pixels de cada lado. Use uma imagem maior e nítida.");
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
    throw new Error("Não foi possível preparar a foto. Tente novamente com uma imagem JPEG.");
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
  const [step, setStep] = useState<"document" | IdentityPart | "review">("document");
  const [documentType, setDocumentType] = useState<(typeof IDENTITY_DOCUMENTS)[number] | "">("");
  const [backUnavailable, setBackUnavailable] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<IdentityPart, Blob>>>({});
  const [notice, setNotice] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const issue = useRef<HTMLParagraphElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) {
        setDate(data.challengeDate);
        setStatus(data.verified ? "APPROVED" : data.attempt?.status ?? "");
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível carregar a verificação. Confira sua conexão e tente novamente.");
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!error) return;
    issue.current?.focus({ preventScroll: true });
    issue.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

  const required = identityParts(backUnavailable);
  const stages = ["document", "front", ...(!backUnavailable ? ["back" as const] : []), "portrait", "review"] as const;
  const index = stages.indexOf(step);
  const part = step === "document" || step === "review" ? null : step;
  const photo = part && photos[part];
  const locked = status === "APPROVED" || status === "PENDING_REVIEW";

  function navigate(next: typeof step) {
    setError("");
    setShowCamera(false);
    setStep(next);
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
  }

  function selectDocument(next: (typeof IDENTITY_DOCUMENTS)[number]) {
    if (documentType && documentType !== next) {
      setPhotos({});
      setBackUnavailable(false);
      setRequestId("");
    }
    setDocumentType(next);
    setError("");
  }

  async function savePhoto(file: File, target: IdentityPart) {
    setShowCamera(false);
    setBusy(true);
    setError("");
    try {
      const image = await preparePhoto(file);
      setRequestId("");
      setPhotos((previous) => ({ ...previous, [target]: image }));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Não foi possível preparar a foto. Tente novamente com uma imagem JPEG.");
    } finally { setBusy(false); }
  }

  function readPhoto(event: ChangeEvent<HTMLInputElement>, target: IdentityPart) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void savePhoto(file, target);
  }

  async function send() {
    if (!notice) { setError("Leia e confirme o aviso de privacidade para enviar."); return; }
    const missing = required.find((target) => !photos[target]);
    if (missing) { navigate(missing); setError(details[missing].required); return; }
    if (!date || !documentType) return;
    setBusy(true);
    setError("");
    try {
      const id = requestId || crypto.randomUUID();
      setRequestId(id);
      const form = new FormData();
      form.set("requestId", id);
      form.set("documentType", documentType);
      form.set("backUnavailable", String(backUnavailable));
      form.set("challengeDate", date);
      form.set("notice", IDENTITY_NOTICE_VERSION);
      for (const target of required) form.set(target, photos[target]!, target + ".jpg");
      const response = await fetch(endpoint, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar os documentos.");
      setStatus(data.attempt.status);
      setPhotos({});
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Falha de conexão. Tente novamente com as mesmas fotos.");
    } finally { setBusy(false); }
  }

  function advance() {
    if (step === "document" && !documentType) { setError("Selecione o tipo de documento para continuar."); return; }
    if (part && !photo) { setError(details[part].required); return; }
    if (step === "review") { void send(); return; }
    navigate(stages[index + 1]);
  }

  const message = error && <p id="identity-issue" ref={issue} tabIndex={-1} className={styles.error} role="alert">{error}</p>;

  return <main className={styles.shell} aria-labelledby="identity-title">
    <section className={styles.card}>
      <header className={styles.header}>
        <span className={styles.emblem}><ShieldCheck aria-hidden="true" /></span>
        <h1 id="identity-title">Verificação de identidade</h1>
        {!locked && <p>{description}</p>}
      </header>

      {locked ? <div className={styles.result}>
        <span className={styles.badge}><Check size={17} aria-hidden="true" /> {labels[status]}</span>
        <h2>{status === "PENDING_REVIEW" ? "Documentos enviados com sucesso!" : "Identidade verificada"}</h2>
        {status === "PENDING_REVIEW" && <p>Sua identidade será analisada pela nossa equipe. Avisaremos quando houver uma atualização.</p>}
        <a className={styles.primary} href="/profissional/novo">Voltar ao meu cadastro <ChevronRight size={18} aria-hidden="true" /></a>
      </div> : !date ? <div className={styles.result}>
        {busy ? <p role="status">Carregando verificação…</p> : <>
          {message}
          <button type="button" className={styles.primary} onClick={() => { setError(""); setBusy(true); setReload((value) => value + 1); }}>Tentar novamente</button>
        </>}
      </div> : <>
        <div className={styles.progress} role="progressbar" aria-label="Progresso da verificação" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={index + 1}>
          {stages.map((item, position) => <span key={item} data-current={position === index} data-reached={position <= index} />)}
        </div>
        <div className={styles.stepTitle}>
          <p>Etapa {index + 1} de {stages.length}</p>
          <h2 ref={heading} tabIndex={-1}>{part ? details[part].title : step === "document" ? "Escolha seu documento" : "Revise as imagens"}</h2>
          {status && <span className={styles.badge}>{labels[status]}</span>}
        </div>

        {step === "document" && <fieldset className={styles.documents} aria-label="Tipo de documento" aria-describedby={error ? "identity-issue" : undefined}>
          {IDENTITY_DOCUMENTS.map((type) => <label key={type} className={styles.document}>
            <input type="radio" name="document" value={type} checked={documentType === type} onChange={() => selectDocument(type)} />
            <IdCard size={22} aria-hidden="true" />
            <span><strong>{type}</strong><small>{documentNames[type]}</small></span>
            <span className={styles.radioMark} aria-hidden="true">{documentType === type && <Check size={15} />}</span>
          </label>)}
          {message}
          {documentType && <label className={styles.check}>
            <input type="checkbox" checked={backUnavailable} onChange={(event) => { setBackUnavailable(event.target.checked); setRequestId(""); }} />
            Meu documento digital não possui verso separado.
          </label>}
        </fieldset>}

        {part && <div className={styles.capture}>
          <p>{details[part].help}</p>
          {part === "portrait" && <p className={styles.challenge}>No papel, escreva <strong>Verificação ELITE MODELL</strong> e a data <strong>{date.split("-").reverse().join("/")}</strong>.</p>}
          {showCamera ? <Camera facing={part === "portrait" ? "user" : "environment"} close={() => setShowCamera(false)}
            onPhoto={(file) => void savePhoto(file, part)} /> :
            <div className={styles.frame} data-ready={Boolean(photo)}>
              {photo ? <><Preview photo={photo} /><span className={styles.badge}><Check size={16} aria-hidden="true" /> Foto pronta</span></> :
                <div>{part === "portrait" ? <ScanFace aria-hidden="true" /> : <IdCard aria-hidden="true" />}<span>Enquadre {part === "portrait" ? "seu rosto e o documento" : "o documento inteiro"}</span></div>}
            </div>}
          <input hidden ref={nativeCamera} aria-label="Capturar foto" type="file" accept="image/*" capture={part === "portrait" ? "user" : "environment"} disabled={busy}
            onChange={(event) => readPhoto(event, part)} />
          {!showCamera && <div className={styles.captureActions}>
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => {
              if (window.matchMedia("(pointer: coarse)").matches || !navigator.mediaDevices?.getUserMedia) nativeCamera.current?.click();
              else setShowCamera(true);
            }}><CameraIcon size={19} aria-hidden="true" /> {photo ? "Refazer foto" : "Tirar foto"}</button>
            {part !== "portrait" && <label className={styles.secondary} data-disabled={busy}>
              <ImagePlus size={19} aria-hidden="true" /> Escolher da galeria
              <input className={styles.fileInput} aria-label="Escolher da galeria" type="file" accept="image/*" disabled={busy} onChange={(event) => readPhoto(event, part)} />
            </label>}
          </div>}
          {busy && <p role="status">Preparando a foto…</p>}
          {message}
        </div>}

        {step === "review" && <div className={styles.review}>
          <p>Confira se as imagens do seu {documentType} estão legíveis.</p>
          <ul>
            {stages.filter((target): target is IdentityPart => target !== "document" && target !== "review").map((target) => {
              const image = photos[target];
              return <li key={target}>
                <div className={styles.thumbnail}>{image && <Preview photo={image} />}</div>
                <strong>{details[target].title}</strong>
                <button type="button" className={styles.edit} disabled={busy} onClick={() => navigate(target)}>Editar<span className={styles.visuallyHidden}> {details[target].title}</span></button>
              </li>;
            })}
          </ul>
          <div className={styles.notice}>
            <p>As fotos são usadas para confirmar identidade e maioridade e ficam disponíveis apenas a revisores autorizados por até {IDENTITY_RETENTION_DAYS} dias. Decisões e auditorias têm prazos próprios.</p>
            <p>Consulte a <a href="/privacy">Política de Privacidade</a> para exercer seus direitos sobre os dados.</p>
            <label className={styles.check}><input type="checkbox" checked={notice} disabled={busy} onChange={(event) => { setNotice(event.target.checked); setError(""); }} /> Li o aviso de privacidade.</label>
          </div>
          {message}
        </div>}

        <footer className={styles.actions}>
          {index > 0 && <button type="button" className={styles.secondary} disabled={busy || showCamera} onClick={() => navigate(stages[index - 1])}><ArrowLeft size={18} aria-hidden="true" /> Voltar</button>}
          <button type="button" className={styles.primary} disabled={busy || showCamera} onClick={advance}>
            {step === "review" ? busy ? "Enviando…" : "Enviar para análise" : "Continuar"} <ChevronRight size={18} aria-hidden="true" />
          </button>
        </footer>
      </>}
    </section>
  </main>;
}
