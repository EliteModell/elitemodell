"use client";
/* eslint-disable @next/next/no-img-element -- Upload previews can be blob/data/private URLs before the final hosted image is available. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { supabaseAuth } from "@/lib/supabase-client";

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
type SingleFormField = "escortCategory" | "hairColor" | "eyeColor" | "ethnicity" | "signo" | "depilationStyle" | "bodyType";
type PriceFormField = "price30min" | "pricePerHour" | "price2h" | "priceOvernight" | "priceWebcam";
type PersonaAvailability = {
  checked: boolean;
  available: boolean;
  message?: string;
  missing?: string[];
  templateInvalid?: boolean;
};

/* ── listas de opções ───────────────────────────────────── */
const CABELOS   = ["Loira", "Morena", "Ruiva", "Castanho", "Colorido", "Preto", "Sem cabelo"];
const OLHOS     = ["Azul", "Castanho", "Verde", "Mel", "Cinza", "Preto"];
const ETNIAS    = ["Branca", "Negra", "Parda", "Oriental", "Indígena", "Latina", "Outra"];
const SIGNOS    = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
const ATENDIMENTO_GRUPOS = [
  {
    title: "Local de atendimento",
    options: ["A domicílio", "Somente local do cliente", "Local próprio", "Não atendo em residência própria", "Hotéis", "Motéis", "Somente hotéis/motéis"],
  },
  {
    title: "Deslocamento",
    options: ["Aceita viajar", "Viagens nacionais", "Viagens internacionais"],
  },
  {
    title: "Eventos e online",
    options: ["Festas e eventos", "Jantares/eventos sociais", "Atendimento virtual/online"],
  },
];
const ATENDE    = ["Homens", "Mulheres", "Casais", "Homens trans", "Mulheres trans", "Não binário"];
const IDIOMAS   = ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão", "Libras", "Outro"];
const BODY_TYPES = ["Corpo atlético", "Corpo magro", "Corpo médio", "Corpo curvy", "Corpo plus size"];
const DEPILATION_STYLES = ["Depilada", "Depilação parcial", "Não depilada"];
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
const DRAFT_KEY = "elitemodell_professional_onboarding_v1";
const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|heic|heif)$/i;
const GENERIC_MOBILE_MIME_TYPES = new Set(["", "application/octet-stream"]);
const MAX_PROFILE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_ONBOARDING_GALLERY_PHOTOS = 20;
const REMOTE_IMAGE_RE = /^(https?:\/\/|\/)/i;
const ATTENDANCE_EXCLUSIONS: Record<string, string[]> = {
  "Somente local do cliente": ["Local próprio", "Hotéis", "Motéis", "Somente hotéis/motéis"],
  "Local próprio": ["Somente local do cliente", "Não atendo em residência própria", "Somente hotéis/motéis"],
  "Não atendo em residência própria": ["Local próprio"],
  "Hotéis": ["Somente local do cliente", "Somente hotéis/motéis"],
  "Motéis": ["Somente local do cliente", "Somente hotéis/motéis"],
  "Somente hotéis/motéis": ["A domicílio", "Somente local do cliente", "Local próprio", "Não atendo em residência própria", "Hotéis", "Motéis"],
  "A domicílio": ["Somente hotéis/motéis"],
};

function generateVerificationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint32Array(8);
  crypto.getRandomValues(randomValues);
  const code = Array.from(randomValues, (value) => chars[value % chars.length]).join("");
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/* ── sub-componentes reutilizáveis ──────────────────────── */
function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      className="model-tag"
    >
      {active && <span className="model-tag-check" aria-hidden="true">✓</span>}
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

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="model-chip-group" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

function UploadZone({ label, accept, preview, onFile, loading }: {
  label: string; accept: string; preview?: string | null; onFile: (f: File) => void; loading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const canPreview = !!preview && (preview.startsWith("http") || preview.startsWith("/") || preview.startsWith("blob:") || preview.startsWith("data:"));
  const isPrivateFile = !!preview && !canPreview;
  const acceptLabel = accept === IMAGE_ACCEPT ? "JPG, PNG, WebP ou HEIC" : accept.replace("image/*,video/*", "JPG, PNG ou MP4");
  return (
    <div>
      {label ? <label style={labelStyle}>{label}</label> : null}
      <div
        onClick={() => !loading && ref.current?.click()}
        style={{
          border: `2px dashed ${preview ? GOLD_MID : "#1e293b"}`,
          borderRadius: 12,
          padding: canPreview || isPrivateFile ? 0 : "28px 16px",
          textAlign: "center",
          cursor: loading ? "wait" : "pointer",
          background: GOLD_DIM,
          overflow: "hidden",
          minHeight: canPreview || isPrivateFile ? 120 : "auto",
          transition: "border-color 0.2s",
          position: "relative",
        }}
      >
        {canPreview ? (
          <>
            <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(6,14,27,0.72)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, border: `3px solid ${GOLD_MID}`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>Enviando…</span>
              </div>
            )}
          </>
        ) : isPrivateFile ? (
          <div style={{ padding: "28px 0", color: GOLD, fontSize: 13, fontWeight: 700 }}>
            {loading ? "Enviando…" : "Arquivo privado enviado ✓"}
          </div>
        ) : loading ? (
          <div style={{ padding: "28px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${GOLD_MID}`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: "#475569", fontSize: 13 }}>Enviando…</span>
          </div>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Clique para selecionar</p>
            <p style={{ color: "#334155", fontSize: 11, margin: "4px 0 0" }}>{acceptLabel}</p>
          </>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function formatBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function parseMoneyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function WhatsAppInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="whatsapp-field">
      <div className="whatsapp-prefix" aria-hidden="true">
        <span>BR</span>
        <strong>+55</strong>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatBrazilPhone(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
        placeholder="(11) 91234-5678"
      />
    </div>
  );
}

function InstagramInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="instagram-field">
      <span aria-hidden="true">@</span>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        value={value.replace("@", "")}
        onChange={(e) => onChange(e.target.value.replace("@", ""))}
        placeholder="seuperfil"
      />
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="money-field">
      <span aria-hidden="true">R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
        placeholder="100"
      />
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
          {recording ? "Parar vídeo" : "Gravar vídeo"}
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
  const [personaAvailability, setPersonaAvailability] = useState<PersonaAvailability>({
    checked: false,
    available: false,
  });
  const [birthDateLockedFromAccount, setBirthDateLockedFromAccount] = useState(false);
  const [birthParts, setBirthParts] = useState({ day: "", month: "", year: "" });
  const birthMonthRef = useRef<HTMLInputElement>(null);
  const birthYearRef = useRef<HTMLInputElement>(null);
  const progressStepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const draftLoadedRef = useRef(false);
  const skipInitialDraftSaveRef = useRef(true);

  /* ── estado do formulário ─────────────────────────────── */
  const [form, setForm] = useState({
    /* etapa 1 */
    displayName: "", bio: "", city: "", state: "", bairro: "", escortCategory: "", birthDate: "", signo: "",
    /* etapa 2 */
    height: "", weight: "", hairColor: "", eyeColor: "", ethnicity: "",
    hasTattoos: false, hasPiercing: false, hasSilicone: false, isDepilada: true,
    depilationStyle: "Depilada", bodyType: "",
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
    const restoreTimer = window.setTimeout(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (!rawDraft) {
        draftLoadedRef.current = true;
        return;
      }

      const parsed = JSON.parse(rawDraft) as { step?: number; form?: Partial<typeof form> };
      if (parsed?.form && typeof parsed.form === "object") {
        setForm((current) => ({
          ...current,
          ...parsed.form,
          galleryUrls: Array.isArray(parsed.form?.galleryUrls) ? parsed.form.galleryUrls.filter((url) => !String(url).startsWith("blob:")) : current.galleryUrls,
          mainPhotoUrl: parsed.form?.mainPhotoUrl && !String(parsed.form.mainPhotoUrl).startsWith("blob:") ? parsed.form.mainPhotoUrl : current.mainPhotoUrl,
          docFrenteFile: null,
          docVersoFile: null,
          verificationFile: null,
        }));

        if (parsed.form.birthDate) {
          const [year, month, day] = String(parsed.form.birthDate).split("-");
          setBirthParts({ day: day ?? "", month: month ?? "", year: year ?? "" });
        }
      }

      if (Number.isInteger(parsed.step)) {
        setStep(Math.max(0, Math.min(Number(parsed.step), STEPS.length - 1)));
      }
    } catch (err) {
      console.warn("[professional-onboarding] Não foi possível restaurar o rascunho local.", err);
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      draftLoadedRef.current = true;
    }
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (!draftLoadedRef.current) return;
    if (skipInitialDraftSaveRef.current) {
      skipInitialDraftSaveRef.current = false;
      return;
    }

    const draftForm = {
      ...form,
      mainPhotoUrl: form.mainPhotoUrl.startsWith("blob:") ? "" : form.mainPhotoUrl,
      galleryUrls: form.galleryUrls.filter((url) => !url.startsWith("blob:")),
      docFrenteFile: null,
      docVersoFile: null,
      verificationFile: null,
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form: draftForm, updatedAt: new Date().toISOString() }));
    } catch (err) {
      console.warn("[professional-onboarding] Não foi possível salvar o rascunho local.", err);
    }
  }, [form, step]);

  useEffect(() => {
    let active = true;

    async function loadUserDefaults() {
      await fetch("/api/users/me/activate-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch((err) => {
        console.warn("[professional-onboarding] Nao foi possivel ativar o contexto profissional.", err);
      });

      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const user = await res.json();
      if (!active) return;

      if (user.professional?.status === "ACTIVE" || user.professional?.status === "PAUSED") {
        router.replace(ACCOUNT_ROUTES.dashboardAcompanhante);
        return;
      }

      const loadedDate = user.birthDate ? String(user.birthDate).slice(0, 10) : "";
      setForm((current) => ({
        ...current,
        escortCategory: current.escortCategory || (["MULHER", "TRANS", "HOMEM"].includes(user.category) ? user.category : ""),
        birthDate: current.birthDate || loadedDate,
      }));
      if (loadedDate) {
        const [y, m, d] = loadedDate.split("-");
        setBirthParts({ day: d ?? "", month: m ?? "", year: y ?? "" });
        setBirthDateLockedFromAccount(true);
      }
    }

    async function loadPersonaAvailability() {
      const res = await fetch("/api/kyc/sessions", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!active) return;

      if (!res.ok) {
        console.warn("[KYC] Não foi possível consultar disponibilidade da Persona.", {
          status: res.status,
          data,
        });
        setPersonaAvailability({
          checked: true,
          available: false,
          message: "Verificação automática indisponível no momento. Use a verificação manual.",
        });
        return;
      }

      setPersonaAvailability({
        checked: true,
        available: Boolean(data.available),
        message: data.message,
        missing: data.missing,
        templateInvalid: data.templateInvalid,
      });
    }

    loadUserDefaults().catch(() => {});
    loadPersonaAvailability().catch((err) => {
      console.warn("[KYC] Erro ao consultar disponibilidade da Persona.", err);
      if (active) {
        setPersonaAvailability({
          checked: true,
          available: false,
          message: "Verificação automática indisponível no momento. Use a verificação manual.",
        });
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleBirthPart(part: "day" | "month" | "year", value: string) {
    setBirthDateLockedFromAccount(false);
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
  function toggleAttendanceOption(val: string) {
    setForm((f) => {
      const current = f.attendanceTypes;
      if (current.includes(val)) {
        return { ...f, attendanceTypes: current.filter((item) => item !== val) };
      }

      const blocked = new Set(ATTENDANCE_EXCLUSIONS[val] ?? []);
      const normalized = current.filter((item) => !blocked.has(item));
      return { ...f, attendanceTypes: [...normalized, val] };
    });
  }
  function toggleSingle(field: SingleFormField, val: string) {
    setForm((f) => ({ ...f, [field]: f[field] === val ? "" : val }));
  }

  function validateImageFile(file: File) {
    const hasAllowedMime = IMAGE_MIME_TYPES.has(file.type);
    const hasAllowedGenericMobileMime = GENERIC_MOBILE_MIME_TYPES.has(file.type) && IMAGE_EXTENSION_RE.test(file.name);

    if (!hasAllowedMime && !hasAllowedGenericMobileMime) {
      return "Use uma imagem em JPG, PNG, WebP ou HEIC.";
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      return "A imagem deve ter no maximo 20MB.";
    }
    return null;
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
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previousPhoto = form.mainPhotoUrl;
    const previewUrl = URL.createObjectURL(file);
    /* Mostra preview imediatamente enquanto faz upload */
    set("mainPhotoUrl", previewUrl);
    setUploadingIdx(-1);
    try {
      const url = await uploadFile(file, "profiles/main");
      /* Substitui blob pela URL remota antes de revogar */
      set("mainPhotoUrl", url);
      /* Aguarda um tick para o React renderizar com a URL remota antes de revogar o blob */
      setTimeout(() => URL.revokeObjectURL(previewUrl), 200);
      toast.success("Foto principal enviada com sucesso!");
    } catch (err) {
      console.error("[professional-onboarding] Erro ao enviar foto principal.", err);
      set("mainPhotoUrl", previousPhoto);
      URL.revokeObjectURL(previewUrl);
      const msg = err instanceof Error ? err.message : "Erro ao enviar foto. Tente novamente.";
      toast.error(msg, { duration: 5000 });
    } finally {
      setUploadingIdx(null);
    }
  }

  /* upload de foto de galeria */
  async function handleGalleryPhoto(file: File) {
    if (form.galleryUrls.length >= MAX_ONBOARDING_GALLERY_PHOTOS) return toast.error("Maximo 20 fotos na galeria.");
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadingIdx(form.galleryUrls.length);
    setForm((current) => ({ ...current, galleryUrls: [...current.galleryUrls, previewUrl] }));
    try {
      const url = await uploadFile(file, "profiles/gallery");
      setForm((current) => ({
        ...current,
        galleryUrls: current.galleryUrls.map((item) => item === previewUrl ? url : item),
      }));
      toast.success("Foto adicionada à galeria.");
    } catch (err) {
      console.error("[professional-onboarding] Erro ao enviar foto da galeria.", err);
      setForm((current) => ({ ...current, galleryUrls: current.galleryUrls.filter((item) => item !== previewUrl) }));
      toast.error(err instanceof Error ? err.message : "Erro ao enviar foto.");
    }
    finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingIdx(null);
    }
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
    if (personaAvailability.checked && !personaAvailability.available) {
      toast.error("Verificação automática indisponível no momento. Use a verificação manual.");
      return;
    }

    setUploadingIdx(100);
    try {
      const res = await fetch("/api/kyc/sessions", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[KYC] Falha ao iniciar verificação facial com Persona.", {
          status: res.status,
          data,
        });
        toast.error(data.error ?? "Não foi possível iniciar a verificação facial com Persona. Tente novamente ou use a verificação manual.");
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
        toast.error(data.message ?? "Verificação manual pendente. Envie sua selfie ou vídeo de verificação abaixo para análise manual.");
        return;
      } else if (data.url?.startsWith("http")) {
        window.location.href = data.url;
      } else {
        toast.success("Verificação facial com Persona iniciada.");
      }
    } catch (err) {
      console.error("[KYC] Erro de rede ao iniciar verificação facial com Persona.", err);
      toast.error("Não foi possível iniciar a verificação facial com Persona. Tente novamente ou use a verificação manual.");
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
        hasTattoos: form.hasTattoos, hasPiercing: form.hasPiercing, hasSilicone: form.hasSilicone, isDepilada: form.isDepilada,
        depilationStyle: form.depilationStyle, bodyType: form.bodyType,
        attendanceTypes: form.attendanceTypes, servesGenders: form.servesGenders, idiomas: form.idiomas,
        diasDisponiveis: form.diasDisponiveis, horarioInicio: form.horarioInicio, horarioFim: form.horarioFim,
        services: form.services, fetishes: form.fetishes,
        specialties: form.services,
        pricePerHour: parseMoneyValue(form.pricePerHour),
        price30min: parseMoneyValue(form.price30min),
        price2h: parseMoneyValue(form.price2h),
        priceOvernight: parseMoneyValue(form.priceOvernight),
        priceWebcam: parseMoneyValue(form.priceWebcam),
        priceMin: parseMoneyValue(form.pricePerHour),
        paymentMethods: form.paymentMethods,
        phone: form.phone, whatsapp: form.whatsapp, instagram: form.instagram, website: form.website,
        image: form.mainPhotoUrl || undefined,
        galleryUrls: form.galleryUrls,
        docType: form.docType,
        docFrenteUrl: form.docFrenteUrl, docVersoUrl: form.docVersoUrl,
        verificationUrl: form.verificationUrl,
        verificationType: form.verificationType,
        verificationCode: generateVerificationCode(),
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
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Perfil enviado! Aguarde a aprovação em até 3 dias úteis.");
      router.push(ACCOUNT_ROUTES.verificacaoAcompanhante);
    } catch { toast.error("Erro ao enviar perfil."); }
    finally { setLoading(false); }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    progressStepRefs.current[step]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [step]);

  function validateStep(targetStep: number) {
    if (targetStep === 0) {
      if (!form.displayName.trim()) return "Informe seu nome artístico.";
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
    if (targetStep === 3 && form.services.length === 0) return "Selecione pelo menos um serviço.";
    if (targetStep === 4) {
      if (!form.pricePerHour && !form.price30min && !form.price2h && !form.priceOvernight && !form.priceWebcam) return "Informe pelo menos um valor.";
      if (form.paymentMethods.length === 0) return "Selecione pelo menos uma forma de pagamento.";
    }
    if (targetStep === 5 && form.whatsapp.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido com DDD.";
    if (targetStep === 6) {
      if (uploadingIdx === -1) return "Aguarde o envio da foto principal terminar.";
      if (form.mainPhotoUrl.startsWith("blob:")) return "A foto está sendo processada, aguarde um momento.";
      if (!form.mainPhotoUrl || !REMOTE_IMAGE_RE.test(form.mainPhotoUrl)) return "Selecione e envie a foto principal do perfil para continuar.";
    }
    if (targetStep === 7) {
      if (!form.docType) return "Selecione o tipo de documento.";
      if (!form.docFrenteUrl || !form.docVersoUrl) return "Envie frente e verso do documento.";
    }
    if (targetStep === 8 && !form.kycSessionId) return "Inicie a validação facial para continuar.";
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

  async function handleExit() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  const personaButtonDisabled =
    uploadingIdx === 100 || (personaAvailability.checked && !personaAvailability.available);
  const personaUnavailable =
    personaAvailability.checked && !personaAvailability.available;

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="model-flow-page" style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
      <header className="model-flow-header">
        <button type="button" onClick={() => router.back()} aria-label="Voltar">←</button>
        <span aria-label="Elite Modell"><b>elite</b>modell</span>
        <button type="button" onClick={handleExit}>Sair</button>
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
        {/* Step bubbles — labels são ocultadas no mobile via CSS (.model-step-bubbles span) */}
        <div className="model-step-bubbles" aria-label="Etapas do cadastro">
          {STEPS.map((s, i) => (
            <div
              key={s}
              ref={(node) => { progressStepRefs.current[i] = node; }}
              data-current={i === step ? "true" : "false"}
              style={{ flex: 1, textAlign: "center", minWidth: 48 }}
            >
              <button
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  background: i <= step ? GOLD : "#1e293b",
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
              <span className="model-step-label" style={{ fontSize: 9, color: i === step ? GOLD : "#334155", fontWeight: i === step ? 700 : 400, textTransform: "uppercase", letterSpacing: 0.3 }}>{s}</span>
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
                {birthDateLockedFromAccount && form.birthDate ? (
                  <div className="birth-date-confirmed">
                    <span>{`${birthParts.day}/${birthParts.month}/${birthParts.year}`}</span>
                    <button type="button" onClick={() => setBirthDateLockedFromAccount(false)}>
                      Alterar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="birth-date-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.78fr) minmax(0, 0.78fr) minmax(0, 1.25fr)", gap: 8 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="bday-day"
                        maxLength={2}
                        placeholder="DD"
                        value={birthParts.day}
                        onChange={(e) => handleBirthPart("day", e.target.value)}
                        style={{ ...inputStyle, textAlign: "center", padding: "12px 6px", minWidth: 0 }}
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
                        style={{ ...inputStyle, textAlign: "center", padding: "12px 6px", minWidth: 0 }}
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
                        style={{ ...inputStyle, textAlign: "center", padding: "12px 6px", minWidth: 0 }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>Minimo 18 anos</div>
                  </>
                )}
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
            <ChipGroup>
              {CABELOS.map((c) => <Tag key={c} label={c} active={form.hairColor === c} onClick={() => toggleSingle("hairColor", c)} />)}
            </ChipGroup>
          </Section>

          <Section title="Cor dos olhos">
            <ChipGroup>
              {OLHOS.map((c) => <Tag key={c} label={c} active={form.eyeColor === c} onClick={() => toggleSingle("eyeColor", c)} />)}
            </ChipGroup>
          </Section>

          <Section title="Etnia">
            <ChipGroup>
              {ETNIAS.map((c) => <Tag key={c} label={c} active={form.ethnicity === c} onClick={() => toggleSingle("ethnicity", c)} />)}
            </ChipGroup>
          </Section>

          <Section title="Signo">
            <ChipGroup>
              {SIGNOS.map((c) => <Tag key={c} label={c} active={form.signo === c} onClick={() => toggleSingle("signo", c)} />)}
            </ChipGroup>
          </Section>

          <Section title="Corpo" desc="Opcional. Escolha apenas o que fizer sentido para o seu perfil.">
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <p className="model-subsection-label">Tipo de corpo</p>
                <ChipGroup>
                  {BODY_TYPES.map((c) => <Tag key={c} label={c} active={form.bodyType === c} onClick={() => toggleSingle("bodyType", form.bodyType === c ? "" : c)} />)}
                </ChipGroup>
              </div>
              <div>
                <p className="model-subsection-label">Características</p>
                <ChipGroup>
                  <Tag label="Com tatuagens" active={form.hasTattoos} onClick={() => set("hasTattoos", true)} />
                  <Tag label="Sem tatuagens" active={!form.hasTattoos} onClick={() => set("hasTattoos", false)} />
                  <Tag label="Com piercing" active={form.hasPiercing} onClick={() => set("hasPiercing", true)} />
                  <Tag label="Sem piercing" active={!form.hasPiercing} onClick={() => set("hasPiercing", false)} />
                  <Tag label="Com silicone" active={form.hasSilicone} onClick={() => set("hasSilicone", true)} />
                  <Tag label="Natural" active={!form.hasSilicone} onClick={() => set("hasSilicone", false)} />
                </ChipGroup>
              </div>
              <div>
                <p className="model-subsection-label">Depilação</p>
                <ChipGroup>
                  {DEPILATION_STYLES.map((d) => (
                    <Tag
                      key={d}
                      label={d}
                      active={form.depilationStyle === d}
                      onClick={() => {
                        set("depilationStyle", d);
                        set("isDepilada", d !== "Não depilada");
                      }}
                    />
                  ))}
                </ChipGroup>
              </div>
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
            <div style={{ display: "grid", gap: 18 }}>
              {ATENDIMENTO_GRUPOS.map((group) => (
                <div key={group.title}>
                  <p className="model-subsection-label">{group.title}</p>
                  <ChipGroup>
                    {group.options.map((a) => <Tag key={a} label={a} active={form.attendanceTypes.includes(a)} onClick={() => toggleAttendanceOption(a)} />)}
                  </ChipGroup>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Atendo" desc="Quem você atende?">
            <ChipGroup>
              {ATENDE.map((a) => <Tag key={a} label={a} active={form.servesGenders.includes(a)} onClick={() => toggleArr("servesGenders", a)} />)}
            </ChipGroup>
          </Section>

          <Section title="Idiomas">
            <ChipGroup>
              {IDIOMAS.map((l) => <Tag key={l} label={l} active={form.idiomas.includes(l)} onClick={() => toggleArr("idiomas", l)} />)}
            </ChipGroup>
          </Section>

          <Section title="Disponibilidade — dias">
            <div className="model-chip-group" style={{ marginBottom: 14 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {[
                { field: "price30min", label: "30 minutos" },
                { field: "pricePerHour", label: "1 hora" },
                { field: "price2h", label: "2 horas" },
                { field: "priceOvernight", label: "Pernoite" },
                { field: "priceWebcam", label: "Vídeo chamada (15min)" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <MoneyInput value={form[field as PriceFormField]} onChange={(value) => set(field as PriceFormField, value)} />
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
                <WhatsAppInput value={form.whatsapp} onChange={(value) => set("whatsapp", value)} />
                <p style={{ fontSize: 11, color: "#334155", margin: "4px 0 0" }}>Formato: DDD + número (ex: 11912345678)</p>
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} placeholder="(11) 9 0000-0000" />
              </div>
              <div>
                <label style={labelStyle}>Instagram</label>
                <InstagramInput value={form.instagram} onChange={(value) => set("instagram", value)} />
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
            <UploadZone label="Foto de capa do perfil *" accept={IMAGE_ACCEPT}
              preview={form.mainPhotoUrl || null}
              loading={uploadingIdx === -1}
              onFile={handleMainPhoto} />
            {form.mainPhotoUrl && (
              <button onClick={() => set("mainPhotoUrl", "")} style={{ marginTop: 8, background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                ✕ Remover foto
              </button>
            )}
          </Section>

          <Section title="Galeria de fotos" desc={`Adicione ate ${MAX_ONBOARDING_GALLERY_PHOTOS} fotos. Fotos de boa qualidade aumentam muito as chances de contato. (${form.galleryUrls.length}/${MAX_ONBOARDING_GALLERY_PHOTOS})`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {form.galleryUrls.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "3/4", background: "#0b1420" }}>
                  <img src={url} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => set("galleryUrls", form.galleryUrls.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(6,14,27,0.9)", border: "none", color: "#f1f5f9", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
              {form.galleryUrls.length < MAX_ONBOARDING_GALLERY_PHOTOS && (
                <div>
                  <UploadZone label="" accept={IMAGE_ACCEPT}
                    preview={null}
                    loading={typeof uploadingIdx === "number" && uploadingIdx >= 0 && uploadingIdx < 90}
                    onFile={handleGalleryPhoto} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                Você pode publicar fotos e vídeos sensuais/adultos, desde que sejam seus e estejam dentro das regras da plataforma.<br />
                Fotos de terceiros, conteúdo ilegal, material sem consentimento ou envolvendo menores de idade serão reprovados.<br />
                Documentos pessoais não devem ser enviados na galeria pública.<br />
                Todo conteúdo pode passar por moderação. A foto principal/capa deve ser adequada para exibição inicial do perfil.
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
            <UploadZone label="Frente do documento *" accept={IMAGE_ACCEPT}
              preview={form.docFrenteUrl || null}
              loading={uploadingIdx === 90}
              onFile={(f) => handleDocUpload(f, "frente")} />
            <UploadZone label="Verso do documento *" accept={IMAGE_ACCEPT}
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
          <Section title="Verificação facial" desc="Para proteger a segurança da plataforma, realizamos uma validação facial para confirmar autenticidade, maioridade e evitar perfis falsos.">

            <div style={{ background: "#060e1b", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>Validação facial segura</p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                O processo é feito em ambiente protegido e leva poucos minutos. Após o envio, seu cadastro permanece em análise até a revisão final da equipe.
              </p>
              <button
                type="button"
                onClick={startFaceBiometry}
                disabled={personaButtonDisabled}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: personaUnavailable ? "#334155" : GOLD, color: personaUnavailable ? "#94a3b8" : "#060e1b", fontSize: 14, fontWeight: 800, cursor: personaButtonDisabled ? "not-allowed" : "pointer" }}
              >
                {uploadingIdx === 100 ? "Iniciando..." : personaUnavailable ? "Verificação automática indisponível" : "Iniciar verificação facial"}
              </button>
              {personaUnavailable && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "#facc15", fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
                  {personaAvailability.message ?? "Verificação automática indisponível no momento. Use a verificação manual."}
                </div>
              )}
              {form.kycSessionId && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, fontSize: 12, fontWeight: 700 }}>
                  {form.kycProvider === "PERSONA" ? "Verificação facial com Persona" : "Verificação manual"}: {form.kycStatus}
                  {form.kycExpiresAt && (
                    <span style={{ display: "block", color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>
                      Expira em {new Date(form.kycExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {form.verificationUrl && form.verificationType === "biometria" && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 8, fontSize: 12, color: GOLD }}>
                Verificação facial com Persona iniciada
              </div>
            )}

            {/* Zona segura explicação */}
            <div style={{ marginTop: 20, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Ambiente seguro</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                A validação facial é usada apenas para análise de autenticidade e segurança. A aprovação do perfil continua dependendo da revisão da equipe.
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
                ["Verificação facial", form.verificationUrl ? "✓ Iniciada" : "Não iniciada"],
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
        .model-chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          align-items: flex-start;
        }
        .model-chip-group button {
          flex: 0 1 auto;
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
          color: #d4d8df !important;
          border-color: rgba(214,168,58,0.28) !important;
          background: rgba(11,11,13,0.74) !important;
        }
        .model-tag {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 7px !important;
          text-align: center !important;
          touch-action: manipulation;
        }
        .model-tag[data-active="true"] {
          color: #070707 !important;
          border-color: rgba(245,215,122,0.95) !important;
          background: linear-gradient(135deg, #f5d77a, #d6a83a 54%, #a77818) !important;
          box-shadow: 0 12px 30px rgba(214,168,58,0.22), inset 0 1px 0 rgba(255,255,255,0.22) !important;
        }
        .model-tag[data-active="false"] {
          color: #d4d8df !important;
          border-color: rgba(214,168,58,0.28) !important;
          background: rgba(11,11,13,0.74) !important;
        }
        .model-tag-check {
          display: inline-grid;
          width: 17px;
          height: 17px;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 999px;
          background: rgba(7,7,7,0.20);
          color: #070707;
          font-size: 11px;
          font-weight: 950;
        }
        .model-subsection-label {
          margin: 0 0 8px !important;
          color: #d6a83a !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .whatsapp-field {
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(214,168,58,0.28);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          overflow: hidden;
        }
        .whatsapp-prefix {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 0;
          border-right: 1px solid rgba(214,168,58,0.20);
          color: #f5d77a;
          font-size: 13px;
          font-weight: 900;
          user-select: none;
        }
        .whatsapp-prefix span {
          display: inline-grid;
          place-items: center;
          width: 27px;
          height: 20px;
          border-radius: 4px;
          background: linear-gradient(135deg, #16a34a, #facc15);
          color: #082f49;
          font-size: 10px;
          font-weight: 950;
        }
        .whatsapp-prefix strong { color: #f5d77a; font-size: 13px; }
        .whatsapp-field input {
          width: 100%;
          min-width: 0;
          min-height: 58px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 15px 14px !important;
          box-shadow: none !important;
        }
        .whatsapp-field:focus-within {
          border-color: rgba(245,184,59,0.72);
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12);
        }
        .instagram-field {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(214,168,58,0.28);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          overflow: hidden;
        }
        .instagram-field > span {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(214,168,58,0.20);
          color: #f5d77a;
          font-size: 16px;
          font-weight: 950;
          user-select: none;
        }
        .instagram-field input {
          width: 100%;
          min-width: 0;
          min-height: 58px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 15px 14px !important;
          box-shadow: none !important;
        }
        .instagram-field:focus-within {
          border-color: rgba(245,184,59,0.72);
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12);
        }
        .money-field {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(214,168,58,0.28);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          overflow: hidden;
        }
        .money-field > span {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(214,168,58,0.20);
          color: #f5d77a;
          font-size: 14px;
          font-weight: 950;
          user-select: none;
        }
        .money-field input {
          width: 100%;
          min-width: 0;
          min-height: 58px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 15px 16px !important;
          color: #fff !important;
          box-shadow: none !important;
        }
        .money-field input::placeholder { color: rgba(184,184,184,0.55) !important; }
        .money-field:focus-within {
          border-color: rgba(245,184,59,0.72);
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12);
        }
        .birth-date-grid {
          grid-template-columns: minmax(0, 0.78fr) minmax(0, 0.78fr) minmax(0, 1.25fr) !important;
          gap: 8px !important;
        }
        .birth-date-grid input {
          min-width: 0 !important;
          padding-left: 6px !important;
          padding-right: 6px !important;
          text-align: center !important;
        }
        .birth-date-confirmed {
          min-height: 58px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(214,168,58,0.28);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          padding: 9px 10px 9px 16px;
        }
        .birth-date-confirmed span {
          color: #fff;
          font-size: 15px;
          font-weight: 800;
        }
        .birth-date-confirmed button {
          min-height: 40px;
          border: 1px solid rgba(214,168,58,0.28) !important;
          border-radius: 12px !important;
          background: rgba(214,168,58,0.10) !important;
          color: #f5d77a !important;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 900;
        }
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
        .model-flow-page > div:nth-of-type(2) > div:nth-child(3) {
          gap: 8px !important;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .model-flow-page > div:nth-of-type(2) > div:nth-child(3)::-webkit-scrollbar { display: none; }
        .model-flow-page > div:nth-of-type(2) > div:nth-child(3) > div {
          flex: 0 0 58px !important;
          min-width: 58px !important;
        }
        .model-flow-page > div:nth-of-type(2) > div:nth-child(3) span {
          color: #aeb6c2 !important;
          line-height: 1.15 !important;
          white-space: normal !important;
          word-break: keep-all;
        }
        .model-step-bubbles {
          scroll-snap-type: x proximity;
          scroll-padding-inline: 42%;
          overscroll-behavior-x: contain;
        }
        .model-step-bubbles > div {
          scroll-snap-align: center;
        }
        .model-step-bubbles > div[data-current="true"] span {
          color: #f5d77a !important;
          font-weight: 950 !important;
        }
        .model-step-bubbles > div[data-current="true"] button {
          transform: scale(1.08);
          box-shadow: 0 0 0 4px rgba(214,168,58,0.14), 0 12px 24px rgba(214,168,58,0.20) !important;
        }
        @media (max-width: 520px) {
          .model-step-bubbles {
            margin-left: -8px !important;
            margin-right: -8px !important;
            padding: 0 44% 4px !important;
          }
          .model-step-bubbles > div {
            flex: 0 0 64px !important;
            min-width: 64px !important;
          }
          .model-step-bubbles > div span {
            font-size: 8px !important;
          }
        }
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
