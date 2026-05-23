"use client";
/* eslint-disable @next/next/no-img-element -- Upload previews can be blob/data/private URLs before the final hosted image is available. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

/* ── constantes de tema ─────────────────────────────────── */
const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", background: "#0b1420",
  border: "1px solid #1e293b", borderRadius: 10, color: "#f1f5f9",
  fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#64748b", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
};

type ArrayFormField = "attendanceTypes" | "servesGenders" | "idiomas" | "diasDisponiveis" | "services" | "fetishes" | "paymentMethods";
type SingleFormField = "escortCategory" | "hairColor" | "eyeColor" | "ethnicity" | "signo";
type BooleanFormField = "hasTattoos" | "hasSilicone" | "isDepilada";
type PriceFormField = "price30min" | "pricePerHour" | "price2h" | "priceOvernight" | "priceWebcam";

/* ── listas de opções ───────────────────────────────────── */
const CABELOS   = ["Loira", "Morena", "Ruiva", "Castanho", "Colorido", "Preto", "Sem cabelo"];
const OLHOS     = ["Azul", "Castanho", "Verde", "Mel", "Cinza", "Preto"];
const ETNIAS    = ["Branca", "Negra", "Parda", "Oriental", "Indígena", "Latina", "Outra"];
const SIGNOS    = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
const ATENDIMENTO = ["A domicílio", "Local próprio", "Hotéis", "Motéis", "Aceita viajar", "Festas e eventos"];
const ATENDE    = ["Homens", "Mulheres", "Casais", "Homens trans", "Mulheres trans", "Não binário"];
const IDIOMAS   = ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];
const SERVICOS  = ["Acompanhamento", "Jantar a dois", "Viagens", "Festas e eventos", "Massagem", "Massagem tântrica", "Vídeo chamada", "Pernoite", "Final de semana", "Hotéis", "Local próprio"];
const FETICHES  = ["Striptease", "Dominação", "Roleplay", "Bondage", "Fantasias/uniformes", "Acessórios eróticos", "Ativo", "Passivo", "Versátil", "Permite filmagem", "Faz sexo virtual"];
const PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência"];
const DIAS_SEMANA = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const DOCS_ACEITOS = ["RG / DNI", "CNH", "Passaporte", "CTPS", "OAB / CRM / CRO"];
const ESTADOS_BR = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const CATEGORIAS = [
  ["MULHER", "Mulher"],
  ["HOMEM", "Homem"],
  ["TRANS", "Trans"],
];

const STEPS = ["Dados", "Aparência", "Atendimento", "Serviços", "Valores", "Contato", "Fotos", "Documentos", "Biometria"];

/* ── sub-componentes reutilizáveis ──────────────────────── */
function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "7px 15px", borderRadius: 20, cursor: "pointer", fontSize: 13,
      fontWeight: active ? 700 : 400,
      border: `1.5px solid ${active ? GOLD : "#1e293b"}`,
      background: active ? GOLD_DIM : "transparent",
      color: active ? "#f1f5f9" : "#475569", transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: desc ? 6 : 14, paddingBottom: 10, borderBottom: `1px solid ${GOLD_DIM}` }}>
        <div style={{ width: 20, height: 2, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>
      </div>
      {desc && <p style={{ color: "#475569", fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>{desc}</p>}
      {children}
    </div>
  );
}

function UploadZone({ label, accept, preview, onFile, loading }: {
  label: string; accept: string; preview?: string | null; onFile: (f: File) => void; loading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const canPreview = !!preview && (preview.startsWith("http") || preview.startsWith("/") || preview.startsWith("blob:") || preview.startsWith("data:"));
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: `2px dashed ${preview ? GOLD_MID : "#1e293b"}`,
          borderRadius: 12, padding: preview ? 0 : "28px 16px",
          textAlign: "center", cursor: "pointer", background: GOLD_DIM,
          overflow: "hidden", minHeight: preview ? 120 : "auto",
          transition: "border-color 0.2s",
        }}
      >
        {loading ? (
          <div style={{ padding: "28px 0", color: "#475569", fontSize: 13 }}>Enviando...</div>
        ) : canPreview ? (
          <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
        ) : preview ? (
          <div style={{ padding: "28px 0", color: GOLD, fontSize: 13, fontWeight: 700 }}>Arquivo privado enviado</div>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Clique para selecionar</p>
            <p style={{ color: "#334155", fontSize: 11, margin: "4px 0 0" }}>{accept.replace("image/*,video/*", "JPG, PNG ou MP4")}</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

function FaceCapture({
  challenge,
  loading,
  onCapture,
}: {
  challenge: string;
  loading?: boolean;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setError("Não foi possível acessar a câmera. Use o upload manual abaixo.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setRecording(false);
  }

  function takeSelfie() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `selfie-verificacao-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onCapture(new File([blob], `liveness-verificacao-${Date.now()}.webm`, { type: "video/webm" }));
    };
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <div style={{ background: "#060e1b", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>Captura pela câmera</p>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>Desafio: <strong style={{ color: GOLD }}>{challenge}</strong></p>
        </div>
        <button type="button" onClick={cameraOn ? stopCamera : startCamera}
          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${GOLD_MID}`, background: cameraOn ? "transparent" : GOLD, color: cameraOn ? GOLD : "#060e1b", fontWeight: 800, cursor: "pointer", fontSize: 12 }}>
          {cameraOn ? "Fechar câmera" : "Abrir câmera"}
        </button>
      </div>

      <div style={{ aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", background: "#0b1420", border: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {cameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        ) : (
          <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>A câmera aparece aqui quando autorizada.</p>
        )}
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <button type="button" onClick={takeSelfie} disabled={!cameraOn || loading}
          style={{ padding: "11px", borderRadius: 8, border: "none", background: !cameraOn || loading ? "#334155" : GOLD, color: "#060e1b", fontWeight: 800, cursor: !cameraOn || loading ? "not-allowed" : "pointer" }}>
          Enviar selfie
        </button>
        <button type="button" onClick={recording ? stopRecording : startRecording} disabled={!cameraOn || loading}
          style={{ padding: "11px", borderRadius: 8, border: `1px solid ${recording ? "rgba(239,68,68,0.5)" : GOLD_MID}`, background: recording ? "rgba(239,68,68,0.12)" : "#0b1420", color: recording ? "#ef4444" : GOLD, fontWeight: 800, cursor: !cameraOn || loading ? "not-allowed" : "pointer" }}>
          {recording ? "Parar video" : "Gravar video"}
        </button>
      </div>
    </div>
  );
}

/* ── componente principal ───────────────────────────────── */
export default function ProfissionalNovoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [birthParts, setBirthParts] = useState({ day: "", month: "", year: "" });
  const birthMonthRef = useRef<HTMLInputElement>(null);
  const birthYearRef = useRef<HTMLInputElement>(null);

  /* código único de verificação – gerado 1x por sessão */
  const verificationCode = useMemo(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("-").slice(0, 4) + "-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }, []);

  /* ── estado do formulário ─────────────────────────────── */
  const [form, setForm] = useState({
    /* etapa 1 */
    displayName: "", bio: "", city: "", state: "", bairro: "", escortCategory: "", birthDate: "", signo: "",
    /* etapa 2 */
    height: "", weight: "", hairColor: "", eyeColor: "", ethnicity: "",
    hasTattoos: false, hasSilicone: false, isDepilada: true,
    /* etapa 3 */
    attendanceTypes: [] as string[], servesGenders: [] as string[], idiomas: [] as string[],
    diasDisponiveis: [] as string[], horarioInicio: "08:00", horarioFim: "22:00",
    /* etapa 4 */
    services: [] as string[], fetishes: [] as string[],
    /* etapa 5 */
    pricePerHour: "", price30min: "", price2h: "", priceOvernight: "", priceWebcam: "",
    paymentMethods: [] as string[],
    /* etapa 6 */
    phone: "", whatsapp: "", instagram: "", website: "",
    /* etapa 7 – fotos */
    mainPhotoUrl: "", galleryUrls: [] as string[],
    /* etapa 8 – documentos */
    docType: "", docFrenteUrl: "", docVersoUrl: "",
    docFrenteFile: null as File | null, docVersoFile: null as File | null,
    /* etapa 9 – verificação */
    verificationUrl: "", verificationFile: null as File | null, verificationType: "foto" as "foto" | "video" | "biometria",
    kycProvider: "", kycSessionId: "", kycStatus: "NOT_STARTED", kycChallenge: "", kycExpiresAt: "",
  });

  useEffect(() => {
    let active = true;

    async function loadUserDefaults() {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const user = await res.json();
      if (!active) return;

      const loadedDate = user.birthDate ? String(user.birthDate).slice(0, 10) : "";
      setForm((current) => ({
        ...current,
        escortCategory: current.escortCategory || (["MULHER", "TRANS", "HOMEM"].includes(user.category) ? user.category : ""),
        birthDate: current.birthDate || loadedDate,
      }));
      if (loadedDate) {
        const [y, m, d] = loadedDate.split("-");
        setBirthParts({ day: d ?? "", month: m ?? "", year: y ?? "" });
      }
    }

    loadUserDefaults().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleBirthPart(part: "day" | "month" | "year", value: string) {
    const maxLen = part === "year" ? 4 : 2;
    const cleaned = value.replace(/\D/g, "").slice(0, maxLen);
    const next = { ...birthParts, [part]: cleaned };
    setBirthParts(next);
    if (next.day.length === 2 && next.month.length === 2 && next.year.length === 4) {
      set("birthDate", `${next.year}-${next.month}-${next.day}`);
    } else {
      set("birthDate", "");
    }
    if (part === "day" && cleaned.length === 2) birthMonthRef.current?.focus();
    if (part === "month" && cleaned.length === 2) birthYearRef.current?.focus();
  }
  function toggleArr(field: ArrayFormField, val: string) {
    setForm((f) => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }
  function toggleSingle(field: SingleFormField, val: string) {
    setForm((f) => ({ ...f, [field]: f[field] === val ? "" : val }));
  }

  /* ── upload helper ────────────────────────────────────── */
  async function uploadFile(file: File, folder: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Erro no upload");
    }
    const d = await res.json();
    return d.url ?? d.path;
  }

  /* upload da foto principal */
  async function handleMainPhoto(file: File) {
    setUploadingIdx(-1);
    try {
      const url = await uploadFile(file, "profiles/main");
      set("mainPhotoUrl", url);
      toast.success("Foto principal enviada!");
    } catch { toast.error("Erro ao enviar foto."); }
    finally { setUploadingIdx(null); }
  }

  /* upload de foto de galeria */
  async function handleGalleryPhoto(file: File) {
    if (form.galleryUrls.length >= 10) return toast.error("Máximo 10 fotos na galeria.");
    setUploadingIdx(form.galleryUrls.length);
    try {
      const url = await uploadFile(file, "profiles/gallery");
      set("galleryUrls", [...form.galleryUrls, url]);
    } catch { toast.error("Erro ao enviar foto."); }
    finally { setUploadingIdx(null); }
  }

  /* upload de documento (privado) */
  async function handleDocUpload(file: File, side: "frente" | "verso") {
    setUploadingIdx(side === "frente" ? 90 : 91);
    try {
      const url = await uploadFile(file, "documentos");
      if (side === "frente") { set("docFrenteUrl", url); set("docFrenteFile", file); }
      else { set("docVersoUrl", url); set("docVersoFile", file); }
      toast.success(`Documento (${side}) enviado com segurança.`);
    } catch { toast.error("Erro ao enviar documento."); }
    finally { setUploadingIdx(null); }
  }

  /* upload da mídia de verificação */
  async function handleVerifMedia(file: File) {
    setUploadingIdx(99);
    try {
      const url = await uploadFile(file, "verificacao");
      set("verificationUrl", url);
      set("verificationFile", file);
      set("verificationType", file.type.startsWith("video/") ? "video" : "foto");
      set("kycProvider", "MANUAL");
      set("kycStatus", "KYC_MANUAL_PENDENTE");
      if (!form.kycSessionId) set("kycSessionId", `manual_upload_${Date.now()}`);
      toast.success("Mídia de verificação enviada!");
    } catch { toast.error("Erro ao enviar mídia."); }
    finally { setUploadingIdx(null); }
  }

  /* ── submit final ─────────────────────────────────────── */
  async function startFaceBiometry() {
    setUploadingIdx(100);
    try {
      const res = await fetch("/api/kyc/sessions", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Biometria facial ainda nao configurada. Envie sua selfie ou video de verificacao abaixo para analise manual.");
        return;
      }

      set("kycProvider", data.provider);
      set("kycSessionId", data.sessionId);
      set("kycStatus", data.status);
      set("kycChallenge", data.challenge ?? "");
      set("kycExpiresAt", data.expiresAt ?? "");
      if (data.url) set("verificationUrl", data.url);
      if (!data.fallback) set("verificationType", "biometria");

      if (data.fallback || data.provider === "MANUAL" || data.provider === "LOCAL_MANUAL") {
        toast.error(data.message ?? "Biometria facial ainda nao configurada. Envie sua selfie ou video de verificacao abaixo para analise manual.");
        return;
      } else if (data.url?.startsWith("http")) {
        window.location.href = data.url;
      } else {
        toast.success("Sessão de biometria facial criada.");
      }
    } catch {
      toast.error("Biometria facial ainda nao configurada. Envie sua selfie ou video de verificacao abaixo para analise manual.");
    } finally {
      setUploadingIdx(null);
    }
  }

  async function submit() {
    const error = validateStep(step);
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        state: form.state,
        bairro: form.bairro || undefined,
        escortCategory: form.escortCategory,
        birthDate: form.birthDate,
        height: form.height ? Number(form.height) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        hairColor: form.hairColor, eyeColor: form.eyeColor, ethnicity: form.ethnicity,
        signo: form.signo,
        hasTattoos: form.hasTattoos, hasSilicone: form.hasSilicone, isDepilada: form.isDepilada,
        attendanceTypes: form.attendanceTypes, servesGenders: form.servesGenders, idiomas: form.idiomas,
        diasDisponiveis: form.diasDisponiveis, horarioInicio: form.horarioInicio, horarioFim: form.horarioFim,
        services: form.services, fetishes: form.fetishes,
        specialties: form.services,
        pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : undefined,
        price30min: form.price30min ? Number(form.price30min) : undefined,
        price2h: form.price2h ? Number(form.price2h) : undefined,
        priceOvernight: form.priceOvernight ? Number(form.priceOvernight) : undefined,
        priceWebcam: form.priceWebcam ? Number(form.priceWebcam) : undefined,
        priceMin: form.pricePerHour ? Number(form.pricePerHour) : undefined,
        paymentMethods: form.paymentMethods,
        phone: form.phone, whatsapp: form.whatsapp, instagram: form.instagram, website: form.website,
        image: form.mainPhotoUrl || undefined,
        galleryUrls: form.galleryUrls,
        docType: form.docType,
        docFrenteUrl: form.docFrenteUrl, docVersoUrl: form.docVersoUrl,
        verificationUrl: form.verificationUrl,
        verificationType: form.verificationType,
        verificationCode,
        kycProvider: form.kycProvider,
        kycSessionId: form.kycSessionId,
        kycStatus: form.kycStatus,
        status: "PENDING_REVIEW",
      };
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Erro ao criar perfil.");
        return;
      }
      toast.success("Perfil enviado! Aguarde a aprovação em até 3 dias úteis.");
      router.push(ACCOUNT_ROUTES.verificacaoAcompanhante);
    } catch { toast.error("Erro ao enviar perfil."); }
    finally { setLoading(false); }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  function validateStep(targetStep: number) {
    if (targetStep === 0) {
      if (!form.displayName.trim()) return "Informe seu nome artistico.";
      if (form.bio.trim().length < 80) return "Escreva uma biografia com pelo menos 80 caracteres.";
      if (!form.escortCategory) return "Selecione uma categoria.";
      if (!form.city.trim()) return "Informe sua cidade.";
      if (!form.state) return "Selecione o estado.";
    }
    if (targetStep === 1) {
      if (!form.birthDate) return "Informe sua data de nascimento.";
      if (form.height && (Number(form.height) < 120 || Number(form.height) > 230)) return "Confira a altura informada.";
      if (form.weight && (Number(form.weight) < 35 || Number(form.weight) > 250)) return "Confira o peso informado.";
    }
    if (targetStep === 2) {
      if (form.attendanceTypes.length === 0) return "Selecione pelo menos um tipo de atendimento.";
      if (form.servesGenders.length === 0) return "Selecione quem você atende.";
      if (form.diasDisponiveis.length === 0) return "Selecione pelo menos um dia disponível.";
    }
    if (targetStep === 3 && form.services.length === 0) return "Selecione pelo menos um servico.";
    if (targetStep === 4) {
      if (!form.pricePerHour && !form.price30min && !form.price2h && !form.priceOvernight && !form.priceWebcam) return "Informe pelo menos um valor.";
      if (form.paymentMethods.length === 0) return "Selecione pelo menos uma forma de pagamento.";
    }
    if (targetStep === 5 && form.whatsapp.replace(/\D/g, "").length < 10) return "Informe um WhatsApp valido com DDD.";
    if (targetStep === 6 && !form.mainPhotoUrl) return "Envie a foto principal do perfil.";
    if (targetStep === 7) {
      if (!form.docType) return "Selecione o tipo de documento.";
      if (!form.docFrenteUrl || !form.docVersoUrl) return "Envie frente e verso do documento.";
    }
    if (targetStep === 8 && !form.verificationUrl) return "Inicie a biometria ou envie a selfie/video de verificacao.";
    return null;
  }

  function next() {
    const error = validateStep(step);
    if (error) { toast.error(error); return; }
    if (step === 0 && !form.displayName) { toast.error("Informe seu nome artístico."); return; }
    if (step === 0 && !form.escortCategory) { toast.error("Selecione uma categoria."); return; }
    if (step === 0 && !form.city) { toast.error("Informe sua cidade."); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="model-flow-page" style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
      <header className="model-flow-header">
        <button type="button" onClick={() => router.back()} aria-label="Voltar">←</button>
        <span aria-label="Elite Modell"><b>elite</b>modell</span>
        <button type="button" onClick={() => router.push(ACCOUNT_ROUTES.dashboardAcompanhante)}>Sair</button>
      </header>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 8px" }}>EliteModell — Novo anúncio</p>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: PLAYFAIR }}>
          Criar perfil de acompanhante
        </h1>
        <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
          Preencha com atenção. Seu perfil é revisado em até 3 dias úteis antes de aparecer publicamente.
        </p>
      </div>

      {/* ── Progresso ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Etapa {step + 1} de {STEPS.length} — {STEPS[step]}</span>
          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 3, background: "#1e293b", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: GOLD, borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
        {/* Step bubbles */}
        <div style={{ display: "flex", marginTop: 14, overflowX: "auto", gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center", minWidth: 48 }}>
              <button
                onClick={() => i < step && setStep(i)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  background: i < step ? GOLD : i === step ? GOLD : "#1e293b",
                  color: i <= step ? "#060e1b" : "#475569",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 4px", fontSize: 11, fontWeight: 700,
                  cursor: i < step ? "pointer" : "default",
                  transition: "all 0.2s",
                  opacity: i > step ? 0.5 : 1,
                }}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <span style={{ fontSize: 9, color: i === step ? GOLD : "#334155", fontWeight: i === step ? 700 : 400, textTransform: "uppercase", letterSpacing: 0.3, display: "block" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ETAPA 1 — DADOS BÁSICOS
      ══════════════════════════════════════════════ */}
      {step === 0 && (
        <div>
          <Section title="Dados básicos" desc="Essas informações aparecem no seu perfil público.">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome artístico *</label>
                <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} style={inputStyle} placeholder="Como quer ser chamada(o)" />
              </div>
              <div>
                <label style={labelStyle}>Biografia</label>
                <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                  placeholder="Conte sobre você, seus diferenciais, o que oferece de especial. Perfis com bio completa recebem até 3x mais contatos." />
                <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{form.bio.length} / 800 caracteres</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inputStyle} placeholder="São Paulo" />
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select value={form.state} onChange={(e) => set("state", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">UF</option>
                    {ESTADOS_BR.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bairro</label>
                  <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} style={inputStyle} placeholder="Centro" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Categoria *">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {CATEGORIAS.map(([val, label]) => (
                <button key={val} type="button" onClick={() => toggleSingle("escortCategory", val)}
                  style={{
                    padding: "16px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14,
                    border: `2px solid ${form.escortCategory === val ? GOLD : "#1e293b"}`,
                    background: form.escortCategory === val ? GOLD_DIM : "#0b1420",
                    color: form.escortCategory === val ? "#f1f5f9" : "#475569",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 2 — APARÊNCIA
      ══════════════════════════════════════════════ */}
      {step === 1 && (
        <div>
          <Section title="Medidas e data de nascimento">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Data de nascimento *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 6 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-day"
                    maxLength={2}
                    placeholder="DD"
                    value={birthParts.day}
                    onChange={(e) => handleBirthPart("day", e.target.value)}
                    style={{ ...inputStyle, textAlign: "center", padding: "12px 6px" }}
                  />
                  <input
                    ref={birthMonthRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-month"
                    maxLength={2}
                    placeholder="MM"
                    value={birthParts.month}
                    onChange={(e) => handleBirthPart("month", e.target.value)}
                    style={{ ...inputStyle, textAlign: "center", padding: "12px 6px" }}
                  />
                  <input
                    ref={birthYearRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    maxLength={4}
                    placeholder="AAAA"
                    value={birthParts.year}
                    onChange={(e) => handleBirthPart("year", e.target.value)}
                    style={{ ...inputStyle, textAlign: "center", padding: "12px 6px" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>Mínimo 18 anos</div>
              </div>
              <div>
                <label style={labelStyle}>Altura (cm)</label>
                <input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} style={inputStyle} placeholder="170" min={140} max={220} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} style={inputStyle} placeholder="60" min={40} max={200} />
              </div>
            </div>
          </Section>

          <Section title="Cabelo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CABELOS.map((c) => <Tag key={c} label={c} active={form.hairColor === c} onClick={() => toggleSingle("hairColor", c)} />)}
            </div>
          </Section>

          <Section title="Cor dos olhos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {OLHOS.map((c) => <Tag key={c} label={c} active={form.eyeColor === c} onClick={() => toggleSingle("eyeColor", c)} />)}
            </div>
          </Section>

          <Section title="Etnia">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ETNIAS.map((c) => <Tag key={c} label={c} active={form.ethnicity === c} onClick={() => toggleSingle("ethnicity", c)} />)}
            </div>
          </Section>

          <Section title="Signo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SIGNOS.map((c) => <Tag key={c} label={c} active={form.signo === c} onClick={() => toggleSingle("signo", c)} />)}
            </div>
          </Section>

          <Section title="Corpo">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[["hasTattoos", form.hasTattoos ? "🖋️ Com tatuagens" : "Sem tatuagens"],
                ["hasSilicone", form.hasSilicone ? "✨ Com silicone" : "Sem silicone"],
                ["isDepilada", form.isDepilada ? "✨ Depilada" : "Não depilada"]].map(([field, label]) => (
                <button key={String(field)} type="button" onClick={() => {
                  const key = field as BooleanFormField;
                  set(key, !form[key]);
                }}
                  style={{ padding: "10px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1.5px solid ${form[field as BooleanFormField] ? GOLD : "#1e293b"}`, background: form[field as BooleanFormField] ? GOLD_DIM : "transparent", color: form[field as BooleanFormField] ? "#f1f5f9" : "#475569" }}>
                  {String(label)}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 3 — ATENDIMENTO
      ══════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          <Section title="Tipo de atendimento" desc="Onde você realiza seus atendimentos?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ATENDIMENTO.map((a) => <Tag key={a} label={a} active={form.attendanceTypes.includes(a)} onClick={() => toggleArr("attendanceTypes", a)} />)}
            </div>
          </Section>

          <Section title="Atendo" desc="Quem você atende?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ATENDE.map((a) => <Tag key={a} label={a} active={form.servesGenders.includes(a)} onClick={() => toggleArr("servesGenders", a)} />)}
            </div>
          </Section>

          <Section title="Idiomas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {IDIOMAS.map((l) => <Tag key={l} label={l} active={form.idiomas.includes(l)} onClick={() => toggleArr("idiomas", l)} />)}
            </div>
          </Section>

          <Section title="Disponibilidade — dias">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {DIAS_SEMANA.map((d) => <Tag key={d} label={d} active={form.diasDisponiveis.includes(d)} onClick={() => toggleArr("diasDisponiveis", d)} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Início</label>
                <input type="time" value={form.horarioInicio} onChange={(e) => set("horarioInicio", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fim</label>
                <input type="time" value={form.horarioFim} onChange={(e) => set("horarioFim", e.target.value)} style={inputStyle} />
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 4 — SERVIÇOS
      ══════════════════════════════════════════════ */}
      {step === 3 && (
        <div>
          <Section title="Serviços oferecidos" desc="Selecione tudo o que você oferece.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SERVICOS.map((s) => <Tag key={s} label={s} active={form.services.includes(s)} onClick={() => toggleArr("services", s)} />)}
            </div>
          </Section>
          <Section title="Comportamento e especialidades">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FETICHES.map((f) => <Tag key={f} label={f} active={form.fetishes.includes(f)} onClick={() => toggleArr("fetishes", f)} />)}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 5 — VALORES
      ══════════════════════════════════════════════ */}
      {step === 4 && (
        <div>
          <Section title="Tabela de preços" desc="Esses valores aparecerão no seu perfil. Você pode alterá-los a qualquer momento.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { field: "price30min", label: "30 minutos" },
                { field: "pricePerHour", label: "1 hora" },
                { field: "price2h", label: "2 horas" },
                { field: "priceOvernight", label: "Pernoite" },
                { field: "priceWebcam", label: "Vídeo chamada (15min)" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, fontWeight: 700 }}>R$</span>
                    <input type="number" min={0} value={form[field as PriceFormField]} onChange={(e) => set(field as PriceFormField, e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 40 }} placeholder="0,00" />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Formas de pagamento aceitas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PAGAMENTO.map((p) => <Tag key={p} label={p} active={form.paymentMethods.includes(p)} onClick={() => toggleArr("paymentMethods", p)} />)}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 6 — CONTATO
      ══════════════════════════════════════════════ */}
      {step === 5 && (
        <div>
          <Section title="Contato" desc="Seus dados de contato aparecem conforme o plano contratado. O WhatsApp pode ser ocultado.">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>WhatsApp *</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, userSelect: "none" }}>🇧🇷 +55</span>
                  <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 11))}
                    style={{ ...inputStyle, paddingLeft: 72 }} placeholder="11 9 0000-0000" />
                </div>
                <p style={{ fontSize: 11, color: "#334155", margin: "4px 0 0" }}>Formato: DDD + número (ex: 11912345678)</p>
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} placeholder="(11) 9 0000-0000" />
              </div>
              <div>
                <label style={labelStyle}>Instagram</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14 }}>@</span>
                  <input value={form.instagram.replace("@", "")} onChange={(e) => set("instagram", e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 32 }} placeholder="seuperfil" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Site pessoal (opcional)</label>
                <input value={form.website} onChange={(e) => set("website", e.target.value)} style={inputStyle} placeholder="https://" />
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 7 — FOTOS
      ══════════════════════════════════════════════ */}
      {step === 6 && (
        <div>
          <Section title="Foto principal" desc="Esta é a primeira foto que os clientes veem. Deve ser real, clara e você pode escolher mostrar ou não o rosto.">
            <UploadZone label="Foto de capa do perfil *" accept="image/*"
              preview={form.mainPhotoUrl || null}
              loading={uploadingIdx === -1}
              onFile={handleMainPhoto} />
            {form.mainPhotoUrl && (
              <button onClick={() => set("mainPhotoUrl", "")} style={{ marginTop: 8, background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                ✕ Remover foto
              </button>
            )}
          </Section>

          <Section title="Galeria de fotos" desc={`Adicione até 10 fotos. Fotos de boa qualidade aumentam muito as chances de contato. (${form.galleryUrls.length}/10)`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {form.galleryUrls.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "3/4", background: "#0b1420" }}>
                  <img src={url} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => set("galleryUrls", form.galleryUrls.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(6,14,27,0.9)", border: "none", color: "#f1f5f9", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
              {form.galleryUrls.length < 10 && (
                <div>
                  <UploadZone label="" accept="image/*"
                    preview={null}
                    loading={typeof uploadingIdx === "number" && uploadingIdx >= 0 && uploadingIdx < 90}
                    onFile={handleGalleryPhoto} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                ✦ Fotos explícitas <strong>não</strong> são permitidas na galeria pública.<br />
                ✦ Você pode usar fotos com o rosto visível ou não — é sua escolha.<br />
                ✦ Fotos de outras pessoas serão reprovadas na moderação.
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 8 — DOCUMENTOS (privado)
      ══════════════════════════════════════════════ */}
      {step === 7 && (
        <div>
          <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Seus documentos são 100% privados</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>
                As fotos do documento são armazenadas com criptografia e acessadas apenas pela equipe de verificação. Clientes nunca verão seus documentos. A análise leva até <strong>3 dias úteis</strong>.
              </p>
            </div>
          </div>

          <Section title="Tipo de documento">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DOCS_ACEITOS.map((d) => (
                <button key={d} type="button" onClick={() => set("docType", d)}
                  style={{ padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, textAlign: "left",
                    border: `1.5px solid ${form.docType === d ? GOLD : "#1e293b"}`,
                    background: form.docType === d ? GOLD_DIM : "#0b1420",
                    color: form.docType === d ? "#f1f5f9" : "#475569" }}>
                  {d}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#334155", marginTop: 10, lineHeight: 1.6 }}>
              Documento com foto, expedido há menos de 10 anos, contendo: nome completo, nome da mãe e data de nascimento.
            </p>
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <UploadZone label="Frente do documento *" accept="image/*"
              preview={form.docFrenteUrl || null}
              loading={uploadingIdx === 90}
              onFile={(f) => handleDocUpload(f, "frente")} />
            <UploadZone label="Verso do documento *" accept="image/*"
              preview={form.docVersoUrl || null}
              loading={uploadingIdx === 91}
              onFile={(f) => handleDocUpload(f, "verso")} />
          </div>

          <Section title="Requisitos do documento">
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Deve estar legível, sem cortes ou borrões",
                "Foto colorida (não aceito preto e branco)",
                "Emitido há menos de 10 anos",
                "Contém nome completo + nome da mãe + data de nascimento",
                "Documentos vencidos não são aceitos",
              ].map((r) => (
                <li key={r} style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  <span style={{ color: GOLD, marginRight: 4 }}>✦</span>{r}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 9 — MÍDIA DE VERIFICAÇÃO
      ══════════════════════════════════════════════ */}
      {step === 8 && (
        <div>
          <Section title="Biometria facial" desc="Esta etapa confirma pessoa real, maioridade e autenticidade do anúncio. Com provedor KYC configurado, a validação facial pode ser automática; sem provedor, cai para análise manual.">

            {/* Código único */}
            <div style={{ background: "#060e1b", border: `2px solid ${GOLD_MID}`, borderRadius: 14, padding: "20px", marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#475569", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Seu código de verificação único</p>
              <div style={{ fontSize: 32, fontWeight: 900, color: GOLD, letterSpacing: 4, fontFamily: "monospace", margin: "0 0 8px" }}>
                {verificationCode}
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Copie este código em um papel e segure-o na foto/vídeo abaixo</p>
            </div>

            {/* Instruções passo a passo */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[
                ["1", "Escreva o código acima em um papel legível (pode ser qualquer papel)"],
                ["2", "Segure o papel próximo ao seu rosto — mas você pode cobrir o rosto se quiser"],
                ["3", "Tire uma selfie clara ou grave um vídeo curto (até 30 segundos)"],
                ["4", "Envie abaixo. Nossa equipe analisa em até 3 dias úteis"],
              ].map(([num, text]) => (
                <div key={num} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 12, color: GOLD }}>
                    {num}
                  </div>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0", lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Upload da mídia */}
            <div style={{ background: "#060e1b", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>Biometria facial</p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                Inicie a validacao facial para confirmar pessoa real e maioridade. Quando um provedor KYC estiver configurado, esta etapa abre a captura com liveness automaticamente.
              </p>
              <button
                type="button"
                onClick={startFaceBiometry}
                disabled={uploadingIdx === 100}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: GOLD, color: "#060e1b", fontSize: 14, fontWeight: 800, cursor: uploadingIdx === 100 ? "not-allowed" : "pointer" }}
              >
                {uploadingIdx === 100 ? "Iniciando..." : "Iniciar biometria facial"}
              </button>
              {form.kycSessionId && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, fontSize: 12, fontWeight: 700 }}>
                  Sessão {form.kycProvider}: {form.kycStatus}
                  {form.kycExpiresAt && (
                    <span style={{ display: "block", color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>
                      Expira em {new Date(form.kycExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {form.kycSessionId && form.kycChallenge && (
              <FaceCapture
                challenge={form.kycChallenge}
                loading={uploadingIdx === 99}
                onCapture={handleVerifMedia}
              />
            )}

            <UploadZone
              label="Fallback: selfie ou vídeo de verificação *"
              accept="image/*,video/mp4,video/webm"
              preview={form.verificationUrl && form.verificationType === "foto" ? form.verificationUrl : null}
              loading={uploadingIdx === 99}
              onFile={handleVerifMedia}
            />
            {form.verificationUrl && form.verificationType === "biometria" && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 8, fontSize: 12, color: GOLD }}>
                Biometria facial iniciada
              </div>
            )}
            {form.verificationUrl && form.verificationType === "video" && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 8, fontSize: 12, color: GOLD }}>
                ✓ Vídeo enviado com sucesso
              </div>
            )}
            {form.verificationUrl && (
              <button onClick={() => { set("verificationUrl", ""); set("verificationFile", null); }}
                style={{ marginTop: 8, background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                ✕ Remover e enviar novamente
              </button>
            )}

            {/* Zona segura explicação */}
            <div style={{ marginTop: 20, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>🛡️ Zona Segura — Seu rosto é opcional</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                Você <strong>não precisa mostrar o rosto</strong> na mídia pública. Após nossa aprovação, você escolhe se a mídia aparece no perfil com rosto visível, sem rosto, ou fica apenas com nossa equipe para fins de verificação interna.
              </p>
            </div>
          </Section>

          {/* Resumo final antes de enviar */}
          <Section title="Resumo do perfil">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Nome artístico", form.displayName || "—"],
                ["Categoria", form.escortCategory || "—"],
                ["Cidade", `${form.city}${form.state ? ", " + form.state : ""}` || "—"],
                ["Foto principal", form.mainPhotoUrl ? "✓ Enviada" : "Não enviada"],
                ["Fotos na galeria", `${form.galleryUrls.length} foto(s)`],
                ["Documento", form.docFrenteUrl ? "✓ Enviado" : "Não enviado"],
                ["Biometria facial", form.verificationUrl ? "✓ Iniciada" : "Não iniciada"],
                ["WhatsApp", form.whatsapp || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: String(value).startsWith("✓") ? "#22c55e" : "#f1f5f9", fontWeight: String(value).startsWith("✓") ? 700 : 400 }}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ padding: "14px 18px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 10, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
              Ao enviar, você confirma ter <strong>18 anos ou mais</strong> e concorda com os Termos de Uso da plataforma. Seu perfil fica em análise por até <strong>3 dias úteis</strong> e só ficará visível após aprovação.
            </p>
          </div>
        </div>
      )}

      {/* ── Navegação entre etapas ── */}
      <div className="model-step-actions" style={{ display: "flex", justifyContent: "space-between", marginTop: 36, paddingTop: 20, borderTop: `1px solid ${GOLD_DIM}` }}>
        <button onClick={back} disabled={step === 0}
          style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${step === 0 ? "#1e293b" : GOLD_MID}`, borderRadius: 10, color: step === 0 ? "#334155" : GOLD, fontSize: 14, cursor: step === 0 ? "default" : "pointer", fontWeight: 600 }}>
          ← Voltar
        </button>

        {!isLast ? (
          <button onClick={next}
            style={{ padding: "12px 32px", background: GOLD, border: "none", borderRadius: 10, color: "#060e1b", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Continuar →
          </button>
        ) : (
          <button onClick={submit} disabled={loading}
            style={{ padding: "12px 32px", background: loading ? "#9e7b2a" : GOLD, border: "none", borderRadius: 10, color: "#060e1b", fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Enviando..." : "Enviar para aprovação ✦"}
          </button>
        )}
      </div>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        :global(html), :global(body) { margin: 0; padding: 0; width: 100%; overflow-x: hidden; background: #050505; }
        .model-flow-page {
          width: 100% !important;
          max-width: 430px !important;
          min-height: 100dvh;
          margin: 0 auto !important;
          padding: max(18px, env(safe-area-inset-top)) 16px calc(144px + env(safe-area-inset-bottom)) !important;
          overflow-x: hidden;
          background: radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%), radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%), #050505;
          color: #fff;
        }
        .model-flow-header {
          min-height: 54px;
          margin: 0 0 30px;
          display: grid;
          grid-template-columns: 54px 1fr 54px;
          align-items: center;
          gap: 10px;
        }
        .model-flow-header button {
          width: 44px;
          height: 44px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 999px;
          background: rgba(11,11,13,0.82);
          color: #d6a83a;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 36px rgba(0,0,0,0.24);
        }
        .model-flow-header button:last-child { width: auto; padding: 0 12px; color: #fff; font-size: 12px; }
        .model-flow-header span { justify-self: center; color: #fff; font-size: 18px; font-weight: 950; }
        .model-flow-header b { color: #d6a83a; }
        .model-flow-page p { color: #b8b8b8 !important; }
        .model-flow-page h1 {
          color: #fff !important;
          font-family: inherit !important;
          font-size: clamp(31px, 9vw, 44px) !important;
          line-height: 1.02 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
          text-wrap: balance;
        }
        .model-flow-page h3 { color: #fff !important; }
        .model-flow-page label, .model-flow-page [style*="uppercase"] { color: #d6a83a !important; }
        .model-flow-page input,
        .model-flow-page textarea,
        .model-flow-page select {
          min-height: 58px !important;
          border: 1px solid rgba(214,168,58,0.28) !important;
          border-radius: 18px !important;
          background: rgba(11,11,13,0.94) !important;
          color: #fff !important;
          padding: 15px 16px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important;
          scroll-margin-bottom: 160px;
        }
        .model-flow-page textarea { min-height: 154px !important; }
        .model-flow-page input::placeholder, .model-flow-page textarea::placeholder { color: rgba(184,184,184,0.55) !important; }
        .model-flow-page input:focus, .model-flow-page textarea:focus, .model-flow-page select:focus {
          border-color: rgba(245,184,59,0.72) !important;
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12) !important;
        }
        .model-flow-page button { border-radius: 18px !important; }
        .model-flow-page [style*="#060e1b"],
        .model-flow-page [style*="#0b1420"],
        .model-flow-page [style*="rgba(212,168,67"],
        .model-flow-page [style*="rgba(34,197,94"] {
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98)) !important;
          border-color: rgba(214,168,58,0.25) !important;
          color: #fff !important;
        }
        .model-flow-page [style*="#1e293b"] { border-color: rgba(214,168,58,0.25) !important; }
        .model-flow-page > div:nth-of-type(2) {
          margin-bottom: 30px !important;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 20px;
          background: rgba(16,16,20,0.74);
          padding: 16px;
          box-shadow: 0 22px 60px rgba(0,0,0,0.26);
        }
        .model-flow-page > div:nth-of-type(2) > div:nth-child(2) {
          height: 5px !important;
          background: rgba(255,255,255,0.10) !important;
          overflow: hidden;
        }
        .model-flow-page > div:nth-of-type(2) > div:nth-child(2) > div { background: linear-gradient(90deg, #d6a83a, #f5d77a) !important; }
        .model-flow-page img { max-width: 100%; height: auto; }
        .model-step-actions {
          position: fixed;
          left: 50%;
          right: auto;
          bottom: 0;
          transform: translateX(-50%);
          width: 100%;
          max-width: 430px;
          z-index: 9999;
          margin-top: 0 !important;
          padding: 14px 16px calc(14px + env(safe-area-inset-bottom)) !important;
          border-top: 1px solid rgba(214,168,58,0.25) !important;
          background: rgba(5,5,5,0.96);
          display: flex !important;
          justify-content: space-between !important;
          gap: 14px !important;
          backdrop-filter: blur(16px);
        }
        .model-step-actions button { min-height: 56px !important; flex: 1; font-weight: 900 !important; }
        .model-step-actions button:first-child {
          border: 1px solid rgba(214,168,58,0.25) !important;
          background: rgba(16,16,20,0.88) !important;
          color: #fff !important;
        }
        .model-step-actions button:last-child {
          border: 0 !important;
          background: linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818) !important;
          color: #070707 !important;
          box-shadow: 0 18px 46px rgba(214,168,58,0.22) !important;
        }
        @media (max-width: 430px) {
          .model-flow-page [style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
