"use client";
/* eslint-disable @next/next/no-img-element -- Upload previews can be blob/data/private URLs before the final hosted image is available. */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { validateBirthDate } from "@/lib/age-validation";
import { supabaseAuth } from "@/lib/supabase-client";
import ProfessionalCityAutocomplete from "@/components/professional-onboarding/ProfessionalCityAutocomplete";

/* ── constantes de tema ─────────────────────────────────── */
const GOLD = "#b72cff";
const GOLD_DIM = "rgba(183, 44, 255,0.10)";
const GOLD_MID = "rgba(183, 44, 255,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", background: "#080808",
  border: "1px solid rgba(183, 44, 255,0.28)", borderRadius: 16, color: "#fcf7ff",
  fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#d77bff", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
};

type ArrayFormField = "attendanceTypes" | "servesGenders" | "idiomas" | "diasDisponiveis" | "services" | "fetishes" | "paymentMethods";
type SingleFormField = "escortCategory" | "hairColor" | "eyeColor" | "ethnicity" | "signo" | "depilationStyle" | "bodyType";
type PriceFormField = "price15min" | "price30min" | "pricePerHour" | "price2h" | "priceOvernight" | "priceWebcam";
type ValidationIssue = { field: string; message: string };
type SubmissionResult = { status: string; receiptStatus?: string };
type DiditStatusResponse = {
  available?: boolean;
  provider?: string;
  sessionId?: string | null;
  status?: string;
  retryAllowed?: boolean;
  message?: string | null;
  url?: string | null;
  error?: string;
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
const ESTADOS_BR = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const CATEGORIAS = [
  ["MULHER", "Mulher"],
  ["HOMEM", "Homem"],
  ["TRANS", "Trans"],
];

const STEPS = ["Dados", "Aparência", "Atendimento", "Serviços", "Valores", "Contato", "Fotos", "Verificação", "Enviar"];
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
        <h3 style={{ color: "#fcf7ff", fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>
      </div>
      {desc && <p style={{ color: "#aaa0b2", fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>{desc}</p>}
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
          border: `2px dashed ${preview ? GOLD_MID : "#251f20"}`,
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
            <span style={{ color: "#aaa0b2", fontSize: 13 }}>Enviando…</span>
          </div>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p style={{ color: "#aaa0b2", fontSize: 13, margin: 0 }}>Clique para selecionar</p>
            <p style={{ color: "#676064", fontSize: 11, margin: "4px 0 0" }}>{acceptLabel}</p>
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

/* ── componente principal ───────────────────────────────── */
export default function ProfissionalNovoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [diditAvailable, setDigitAvailable] = useState(false);
  const [diditMessage, setDigitMessage] = useState<string | null>(null);
  const [diditRetryAllowed, setDigitRetryAllowed] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [replacementEmail, setReplacementEmail] = useState("");
  const [validationIssue, setValidationIssue] = useState<ValidationIssue | null>(null);
  const [draftSaveError, setDraftSaveError] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [birthDateLockedFromAccount, setBirthDateLockedFromAccount] = useState(false);
  const [birthParts, setBirthParts] = useState({ day: "", month: "", year: "" });
  const birthMonthRef = useRef<HTMLInputElement>(null);
  const birthYearRef = useRef<HTMLInputElement>(null);
  const progressStepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const draftLoadedRef = useRef(false);
  const skipInitialDraftSaveRef = useRef(true);
  const submittingRef = useRef(false);
  const diditStartingRef = useRef(false);

  /* ── estado do formulário ─────────────────────────────── */
  const [form, setForm] = useState({
    /* etapa 1 */
    displayName: "", bio: "", city: "", state: "", bairro: "", placeId: "", escortCategory: "", birthDate: "", signo: "",
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
    price15min: "", pricePerHour: "", price30min: "", price2h: "", priceOvernight: "", priceWebcam: "",
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
        const safeDraftForm = { ...parsed.form };
        delete safeDraftForm.verificationUrl;
        delete safeDraftForm.kycProvider;
        delete safeDraftForm.kycSessionId;
        delete safeDraftForm.kycStatus;
        setForm((current) => ({
          ...current,
          ...safeDraftForm,
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
      verificationUrl: "",
      kycProvider: "",
      kycSessionId: "",
      kycStatus: "NOT_STARTED",
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form: draftForm, updatedAt: new Date().toISOString() }));
      window.setTimeout(() => setDraftSaveError(false), 0);
    } catch (err) {
      console.warn("[professional-onboarding] Não foi possível salvar o rascunho local.", err);
      window.setTimeout(() => setDraftSaveError(true), 0);
    }
  }, [form, step]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = window.setInterval(() => setEmailCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (emailVerified !== false) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) return;
        const user = await response.json() as { email?: string; emailVerified?: string | boolean | null };
        if (!active) return;
        setAccountEmail(user.email ?? null);
        if (user.emailVerified) setEmailVerified(true);
      } catch {
        // Mantém o aviso e permite uma nova tentativa quando a conexão voltar.
      }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") void refreshStatus(); };
    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [emailVerified]);

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

      setAccountEmail(user.email ?? null);
      setEmailVerified(Boolean(user.emailVerified));

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

    async function loadDigitAvailability() {
      const res = await fetch("/api/didit/session", { method: "GET" });
      const data = await res.json().catch(() => ({})) as DiditStatusResponse;
      if (!active) return;
      setDigitAvailable(Boolean(data.available));
      setDigitMessage(data.message ?? null);
      setDigitRetryAllowed(Boolean(data.retryAllowed));
      if (data.sessionId || data.status === "NOT_STARTED") {
        setForm((current) => ({
          ...current,
          kycProvider: data.sessionId ? "DIDIT" : "",
          kycSessionId: data.sessionId ?? "",
          kycStatus: data.status ?? "NOT_STARTED",
          verificationUrl: data.url ?? "",
        }));
      }
    }

    loadUserDefaults().catch(() => {});
    loadDigitAvailability().catch(() => { if (active) setDigitAvailable(false); });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (step < 7) return;
    let active = true;

    const refreshDigitStatus = async () => {
      try {
        const response = await fetch("/api/didit/session", { cache: "no-store" });
        const data = await response.json().catch(() => ({})) as DiditStatusResponse;
        if (!active || !response.ok) return;
        setDigitAvailable(Boolean(data.available));
        setDigitMessage(data.message ?? null);
        setDigitRetryAllowed(Boolean(data.retryAllowed));
        setForm((current) => ({
          ...current,
          kycProvider: data.sessionId ? "DIDIT" : "",
          kycSessionId: data.sessionId ?? "",
          kycStatus: data.status ?? "NOT_STARTED",
          verificationUrl: data.url ?? "",
        }));
      } catch {
        // Mantém o estado local e tenta novamente quando a página recuperar foco.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshDigitStatus();
    };
    void refreshDigitStatus();
    window.addEventListener("focus", refreshDigitStatus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshDigitStatus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [step]);

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (validationIssue?.field === field) setValidationIssue(null);
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
    if (["profiles", "profile-videos", "stories", "properties"].some((prefix) => folder.startsWith(prefix))) {
      fd.append("contentDeclarationAccepted", "true");
    }
    const res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Erro no upload");
    }
    const d = await res.json();
    const uploaded = d.url ?? d.path;
    if (!uploaded) {
      throw new Error(d.message ?? "Arquivo mantido em quarentena para revisão.");
    }
    return uploaded;
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

  /* ── verificação Didit ────────────────────────────────── */
  async function startDigitVerification() {
    if (diditStartingRef.current || uploadingIdx === 100) return;
    if (form.kycStatus === "APPROVED") return;

    diditStartingRef.current = true;
    setUploadingIdx(100);
    try {
      const res = await fetch("/api/didit/session", { method: "POST" });
      const data = await res.json().catch(() => ({})) as DiditStatusResponse & { reused?: boolean };
      if (!res.ok) {
        console.error("[Didit] Falha ao iniciar verificacao.", { status: res.status, data });
        toast.error(data.error ?? "Não foi possível iniciar a verificação. Tente novamente.");
        return;
      }

      set("kycProvider", data.provider ?? "DIDIT");
      set("kycSessionId", data.sessionId ?? "");
      set("kycStatus", data.status ?? "PENDING");
      setDigitMessage(data.message ?? null);
      setDigitRetryAllowed(Boolean(data.retryAllowed));
      set("verificationType", "biometria");
      if (data.url) set("verificationUrl", data.url);

      if (data.url?.startsWith("http")) {
        window.location.href = data.url;
      } else if (data.status === "APPROVED") {
        toast.success("Identidade verificada.");
      } else if (data.reused) {
        toast.success("Sua verificação já está em andamento. Atualizamos o status.");
      } else {
        toast.success("Verificação iniciada.");
      }
    } catch (err) {
      console.error("[Didit] Erro de rede ao iniciar verificacao.", err);
      toast.error("Não foi possível iniciar a verificação. Tente novamente.");
    } finally {
      diditStartingRef.current = false;
      setUploadingIdx(null);
    }
  }

  /* ── submit final ─────────────────────────────────────── */
  function maskEmail(value: string | null) {
    if (!value || !value.includes("@")) return "seu e-mail";
    const [local, domain] = value.split("@");
    return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
  }

  async function requestEmailConfirmation(action: "resend" | "change") {
    if (emailBusy || (action === "resend" && emailCooldown > 0)) return;
    setEmailBusy(true);
    try {
      const response = await fetch("/api/auth/email-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "change" ? { action, email: replacementEmail } : { action }),
      });
      const data = await response.json().catch(() => ({})) as { error?: unknown; maskedEmail?: string; verified?: boolean };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível solicitar a confirmação agora.");
      if (data.verified) {
        setEmailVerified(true);
        toast.success("Seu e-mail já está confirmado.");
        return;
      }
      if (action === "change") {
        setAccountEmail(replacementEmail.trim().toLowerCase());
        setReplacementEmail("");
        setEditingEmail(false);
      }
      setEmailCooldown(60);
      toast.success(`Solicitação aceita. Confira ${data.maskedEmail ?? "seu e-mail"} e a pasta de spam.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível solicitar a confirmação agora.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function checkEmailConfirmation() {
    setEmailBusy(true);
    try {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      const user = response.ok ? await response.json() as { emailVerified?: string | boolean | null } : null;
      if (user?.emailVerified) {
        setEmailVerified(true);
        toast.success("E-mail confirmado. Você já pode concluir o envio.");
      } else {
        toast.error("A confirmação ainda não foi identificada. Abra o link recebido e tente novamente.");
      }
    } finally {
      setEmailBusy(false);
    }
  }

  function showValidationIssue(issue: ValidationIssue, targetStep = step) {
    setValidationIssue(issue);
    if (targetStep !== step) setStep(targetStep);
    toast.error(issue.message);
    window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(`[data-field="${issue.field}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus();
    }, targetStep === step ? 0 : 120);
  }

  function responseError(data: unknown) {
    if (!data || typeof data !== "object") return "Erro ao criar perfil.";
    const record = data as { error?: unknown; fields?: Array<{ message?: unknown }> };
    if (typeof record.error === "string") return record.error;
    const firstMessage = record.fields?.find((item) => typeof item.message === "string")?.message;
    return typeof firstMessage === "string" ? firstMessage : "Não foi possível enviar o perfil.";
  }

  async function recoverSubmittedProfile() {
    try {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      if (!response.ok) return false;
      const user = await response.json() as { professional?: { status?: string } };
      if (user.professional?.status === "PENDING_REVIEW") {
        localStorage.removeItem(DRAFT_KEY);
        setSubmissionResult({ status: "PENDING_REVIEW" });
        return true;
      }
    } catch {
      // A mensagem de tentativa segura é exibida abaixo.
    }
    return false;
  }

  async function submit() {
    if (submittingRef.current) return;
    for (let currentStep = 0; currentStep < STEPS.length; currentStep += 1) {
      const issue = validateStep(currentStep);
      if (issue) {
        showValidationIssue(issue, currentStep);
        return;
      }
    }
    if (emailVerified === false) {
      toast.error("Confirme seu e-mail antes de enviar para análise. Seu rascunho está preservado.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        state: form.state,
        bairro: form.bairro || undefined,
        placeId: form.placeId && !form.placeId.startsWith("local-") ? form.placeId : undefined,
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
        price15min: parseMoneyValue(form.price15min),
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
      const data = await res.json().catch(() => ({})) as { error?: unknown; status?: string; receiptStatus?: string };
      if (!res.ok) {
        toast.error(responseError(data));
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      setSubmissionResult({ status: data.status ?? "PENDING_REVIEW", receiptStatus: data.receiptStatus });
    } catch {
      const recovered = await recoverSubmittedProfile();
      if (!recovered) toast.error("Não foi possível confirmar o envio. Seu rascunho foi preservado; tente novamente com segurança.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
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

  function validateStep(targetStep: number): ValidationIssue | null {
    if (targetStep === 0) {
      if (!form.displayName.trim()) return { field: "displayName", message: "Informe seu nome artístico." };
      if (form.bio.trim().length < 80) return { field: "bio", message: "Escreva uma biografia com pelo menos 80 caracteres." };
      if (!form.escortCategory) return { field: "escortCategory", message: "Selecione uma categoria." };
      if (!form.city.trim()) return { field: "city", message: "Informe sua cidade." };
      if (!form.state) return { field: "state", message: "Selecione o estado." };
    }
    if (targetStep === 1) {
      const birthDate = validateBirthDate(form.birthDate);
      if (!birthDate.isValid || !birthDate.isOfAge) return { field: "birthDate", message: birthDate.errors[0] || "Confira sua data de nascimento." };
      if (form.height && (Number(form.height) < 120 || Number(form.height) > 230)) return { field: "height", message: "Confira a altura informada." };
      if (form.weight && (Number(form.weight) < 35 || Number(form.weight) > 250)) return { field: "weight", message: "Confira o peso informado." };
    }
    if (targetStep === 2) {
      if (form.attendanceTypes.length === 0) return { field: "attendanceTypes", message: "Selecione pelo menos um tipo de atendimento." };
      if (form.servesGenders.length === 0) return { field: "servesGenders", message: "Selecione quem você atende." };
      if (form.diasDisponiveis.length === 0) return { field: "diasDisponiveis", message: "Selecione pelo menos um dia disponível." };
    }
    if (targetStep === 3 && form.services.length === 0) return { field: "services", message: "Selecione pelo menos um serviço." };
    if (targetStep === 4) {
      if (!form.price15min && !form.pricePerHour && !form.price30min && !form.price2h && !form.priceOvernight && !form.priceWebcam) return { field: "pricePerHour", message: "Informe pelo menos um valor." };
      if (form.paymentMethods.length === 0) return { field: "paymentMethods", message: "Selecione pelo menos uma forma de pagamento." };
    }
    if (targetStep === 5 && form.whatsapp.replace(/\D/g, "").length < 10) return { field: "whatsapp", message: "Informe um WhatsApp válido com DDD." };
    if (targetStep === 6) {
      if (uploadingIdx === -1) return { field: "mainPhotoUrl", message: "Aguarde o envio da foto principal terminar." };
      if (form.mainPhotoUrl.startsWith("blob:")) return { field: "mainPhotoUrl", message: "A foto está sendo processada, aguarde um momento." };
      if (!form.mainPhotoUrl || !REMOTE_IMAGE_RE.test(form.mainPhotoUrl)) return { field: "mainPhotoUrl", message: "Selecione e envie a foto principal do perfil para continuar." };
    }
    if (targetStep === 7 && form.kycStatus !== "APPROVED") {
      return {
        field: "kycSessionId",
        message: form.kycStatus === "REJECTED"
          ? "Não foi possível concluir sua verificação de identidade. Tente novamente."
          : form.kycSessionId
            ? "Sua verificação de identidade ainda está em análise."
            : "Verifique sua identidade com a Didit para continuar.",
      };
    }
    return null;
  }

  function next() {
    const issue = validateStep(step);
    if (issue) { showValidationIssue(issue); return; }
    setValidationIssue(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function handleExit() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  const diditApproved = form.kycStatus === "APPROVED";
  const diditRejected = form.kycStatus === "REJECTED";
  const diditPending = Boolean(form.kycSessionId) && !diditApproved && !diditRejected;

  if (submissionResult) {
    return (
      <main className="model-submission-success">
        <Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={184} height={61} priority />
        <div aria-hidden="true" className="model-success-check">✓</div>
        <p className="model-success-eyebrow">Cadastro recebido</p>
        <h1>Seu cadastro foi enviado para análise</h1>
        <p>A equipe fará a revisão do perfil. Você pode acompanhar o andamento sem reenviar os dados.</p>
        {submissionResult.receiptStatus === "SENT" ? (
          <p className="model-receipt-status">Enviamos um comprovante discreto para o seu e-mail.</p>
        ) : (
          <p className="model-receipt-status">O cadastro está salvo. Se o comprovante não chegar, confira também a pasta de spam.</p>
        )}
        <a href={ACCOUNT_ROUTES.verificacaoAcompanhante}>Acompanhar verificação</a>
        <style>{`
          .model-submission-success { min-height:100dvh; max-width:430px; margin:0 auto; padding:calc(44px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; background:radial-gradient(circle at 50% 20%,rgba(183,44,255,.16),transparent 38%),#faf8fc; color:#171219; }
          .model-submission-success img { width:184px; height:auto; margin-bottom:34px; }
          .model-success-check { display:grid; place-items:center; width:72px; height:72px; border-radius:999px; background:#7d179f; color:#fff; font-size:36px; font-weight:900; box-shadow:0 14px 36px rgba(125,23,159,.25); }
          .model-success-eyebrow { margin:24px 0 8px; color:#7d179f; font-size:12px; font-weight:900; letter-spacing:2px; text-transform:uppercase; }
          .model-submission-success h1 { margin:0; max-width:360px; font-size:32px; line-height:1.08; }
          .model-submission-success p:not(.model-success-eyebrow) { max-width:350px; color:#625c68; line-height:1.6; }
          .model-receipt-status { padding:12px 14px; border:1px solid #d8c9df; border-radius:14px; background:#fff; font-size:13px; }
          .model-submission-success a { width:100%; margin-top:16px; padding:16px 20px; border-radius:16px; background:#7d179f; color:#fff; font-weight:900; text-decoration:none; }
        `}</style>
      </main>
    );
  }

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="model-flow-page" style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
      <header className="model-flow-header">
        <button type="button" onClick={() => router.back()} aria-label="Voltar">←</button>
        <span className="model-flow-logo" aria-label="Elite Modell">
          <Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={184} height={61} priority style={{ width: 184, height: "auto", objectFit: "contain", opacity: 1, filter: "none" }} />
        </span>
        <button type="button" onClick={handleExit}>Sair</button>
      </header>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 8px" }}>Elite Modell — Novo anúncio</p>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: "#fcf7ff", margin: "0 0 6px", fontFamily: PLAYFAIR }}>
          Criar perfil de acompanhante
        </h1>
        <p style={{ color: "#aaa0b2", fontSize: 13, margin: 0 }}>
          Preencha com atenção. Seu perfil é revisado em até 3 dias úteis antes de aparecer publicamente.
        </p>
      </div>

      {emailVerified === false && (
        <div className="model-email-warning" role="status" style={{
          margin: "0 0 22px",
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid rgba(183, 44, 255,0.35)",
          background: "rgba(183, 44, 255,0.10)",
          color: "#fcf7ff",
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          <strong style={{ display: "block", color: GOLD, marginBottom: 4 }}>E-mail pendente de confirmação</strong>
          <p style={{ margin: "0 0 10px" }}>Você pode preencher as 9 etapas agora. Para enviar para análise, confirme o link solicitado para <strong>{maskEmail(accountEmail)}</strong>. Confira também a pasta de spam.</p>
          {editingEmail ? (
            <div className="model-email-actions">
              <input type="email" autoComplete="email" value={replacementEmail} onChange={(event) => setReplacementEmail(event.target.value)} placeholder="novo@email.com" />
              <button type="button" disabled={emailBusy || !replacementEmail.trim()} onClick={() => requestEmailConfirmation("change")}>Salvar e solicitar confirmação</button>
              <button type="button" className="secondary" onClick={() => setEditingEmail(false)}>Cancelar</button>
            </div>
          ) : (
            <div className="model-email-actions">
              <button type="button" disabled={emailBusy || emailCooldown > 0} onClick={() => requestEmailConfirmation("resend")}>
                {emailCooldown > 0 ? `Reenviar em ${emailCooldown}s` : emailBusy ? "Solicitando..." : "Reenviar confirmação"}
              </button>
              <button type="button" className="secondary" disabled={emailBusy} onClick={checkEmailConfirmation}>Já confirmei</button>
              <button type="button" className="secondary" onClick={() => setEditingEmail(true)}>Corrigir e-mail</button>
            </div>
          )}
        </div>
      )}

      {draftSaveError && (
        <div className="model-draft-warning" role="alert">
          Não foi possível salvar este rascunho no aparelho. Mantenha esta aba aberta e tente novamente antes de sair.
        </div>
      )}

      {/* ── Progresso ── */}
      <div className="model-progress-card" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#968a9e", fontWeight: 600 }}>Etapa {step + 1} de {STEPS.length} — {STEPS[step]}</span>
          <span aria-live="polite" style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 3, background: "#251f20", borderRadius: 3 }}>
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
                type="button"
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={`Etapa ${i + 1}: ${s}${i === step ? ", atual" : i < step ? ", concluída" : ", ainda não disponível"}`}
                disabled={i > step}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  background: i <= step ? GOLD : "#141212",
                  color: i <= step ? "#080808" : "#b4adb0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 4px", fontSize: 11, fontWeight: 700,
                  cursor: i < step ? "pointer" : "default",
                  transition: "all 0.2s",
                  opacity: i > step ? 0.76 : 1,
                }}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <span className="model-step-label" style={{ fontSize: 9, color: i === step ? GOLD : "#676064", fontWeight: i === step ? 700 : 400, textTransform: "uppercase", letterSpacing: 0.3 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ETAPA 1 — DADOS BÁSICOS
      ══════════════════════════════════════════════ */}
      <div className="model-step-content" data-onboarding-step={step + 1}>
      {validationIssue && <p className="model-validation-summary" role="alert">{validationIssue.message}</p>}
      {step === 0 && (
        <div>
          <Section title="Dados básicos" desc="Essas informações aparecem no seu perfil público.">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome artístico *</label>
                <input data-field="displayName" aria-invalid={validationIssue?.field === "displayName" || undefined} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} style={inputStyle} placeholder="Como quer ser chamada(o)" />
              </div>
              <div>
                <label style={labelStyle}>Biografia</label>
                <textarea data-field="bio" aria-invalid={validationIssue?.field === "bio" || undefined} value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                  placeholder="Conte sobre você, seus diferenciais, o que oferece de especial. Perfis com bio completa recebem até 3x mais contatos." />
                <div style={{ fontSize: 11, color: "#94899d", marginTop: 4 }}>{form.bio.length} / 800 caracteres</div>
              </div>
              <div className="model-location-grid">
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <ProfessionalCityAutocomplete
                    city={form.city}
                    state={form.state}
                    placeId={form.placeId}
                    invalid={validationIssue?.field === "city"}
                    onChange={(location) => {
                      setForm((current) => ({ ...current, ...location }));
                      if (validationIssue?.field === "city" || validationIssue?.field === "state") setValidationIssue(null);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select data-field="state" aria-invalid={validationIssue?.field === "state" || undefined} value={form.state} disabled={Boolean(form.placeId)} onChange={(e) => set("state", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Selecione a UF</option>
                    {ESTADOS_BR.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {form.placeId && <span className="city-status">UF definida pela cidade selecionada.</span>}
                </div>
                <div>
                  <label style={labelStyle}>Bairro</label>
                  <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} style={inputStyle} placeholder="Digite seu bairro" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Categoria *">
            <div data-field="escortCategory" className="model-category-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {CATEGORIAS.map(([val, label]) => (
                <button key={val} type="button" onClick={() => toggleSingle("escortCategory", val)}
                  className="model-category-option"
                  data-selected={form.escortCategory === val}
                  aria-pressed={form.escortCategory === val}
                  style={{
                    padding: "16px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14,
                    border: `2px solid ${form.escortCategory === val ? GOLD : "rgba(183, 44, 255,0.24)"}`,
                    background: form.escortCategory === val ? GOLD_DIM : "#080808",
                    color: form.escortCategory === val ? "#ffffff" : "#b4adb0",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                  <span>{label}</span>
                  {form.escortCategory === val && <span className="model-category-check" aria-hidden="true">✓</span>}
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
            <div className="model-measures-grid">
              <div data-field="birthDate" className="model-birth-date-field">
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
                    <div style={{ fontSize: 10, color: "#94899d", marginTop: 3 }}>Minimo 18 anos</div>
                  </>
                )}
              </div>
              <div>
                <label style={labelStyle}>Altura (cm)</label>
                <input data-field="height" type="number" value={form.height} onChange={(e) => set("height", e.target.value)} style={inputStyle} placeholder="170" min={140} max={220} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input data-field="weight" type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} style={inputStyle} placeholder="60" min={40} max={200} />
              </div>
            </div>
            {validationIssue && ["birthDate", "height", "weight"].includes(validationIssue.field) && <p className="model-field-error" role="alert">{validationIssue.message}</p>}
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
                { field: "price15min", label: "15 minutos" },
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
                <p style={{ fontSize: 11, color: "#94899d", margin: "4px 0 0" }}>Formato: DDD + número (ex: 11912345678)</p>
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
              <button onClick={() => set("mainPhotoUrl", "")} style={{ marginTop: 8, background: "none", border: "none", color: "#aaa0b2", fontSize: 12, cursor: "pointer" }}>
                ✕ Remover foto
              </button>
            )}
          </Section>

          <Section title="Galeria de fotos" desc={`Adicione ate ${MAX_ONBOARDING_GALLERY_PHOTOS} fotos. Fotos de boa qualidade aumentam muito as chances de contato. (${form.galleryUrls.length}/${MAX_ONBOARDING_GALLERY_PHOTOS})`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {form.galleryUrls.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "3/4", background: "#080808" }}>
                  <img src={url} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => set("galleryUrls", form.galleryUrls.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(6,14,27,0.9)", border: "none", color: "#fcf7ff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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
              <p style={{ margin: 0, fontSize: 12, color: "#b4adb0", lineHeight: 1.6 }}>
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
          ETAPA 8 — VERIFICAÇÃO DE IDENTIDADE
      ══════════════════════════════════════════════ */}
      {step === 7 && (
        <div>
          <Section title="Revise seus dados" desc="Confira as informações principais antes de verificar sua identidade.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {[
                ["Nome artístico", form.displayName || "—"],
                ["Categoria", form.escortCategory || "—"],
                ["Localização", `${form.city}${form.state ? ", " + form.state : ""}` || "—"],
                ["Fotos", `${1 + form.galleryUrls.length} foto(s)`],
                ["Contato", form.whatsapp || "—"],
              ].map(([label, value]) => (
                <div className="model-summary-tile" key={label} style={{ background: "#080808", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#aaa0b2", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#fcf7ff" }}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="🔐 Verifique sua identidade"
            desc="Para aumentar a segurança da Elite Modell, precisamos confirmar sua identidade antes de enviar seu cadastro para análise."
          >
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🛡️</span>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "#22c55e" }}>Verificação segura pela Didit</p>
                <p style={{ margin: 0, fontSize: 12, color: "#b4adb0", lineHeight: 1.65 }}>
                  Você será direcionada para a verificação segura da Didit. Será necessário apresentar seu documento e realizar a verificação solicitada. Clientes nunca verão seus documentos.
                </p>
              </div>
            </div>

            {diditApproved ? (
              <div data-field="kycSessionId" style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: 15, fontWeight: 800 }}>
                ✓ Identidade verificada
              </div>
            ) : (
              <>
                <button
                  data-field="kycSessionId"
                  type="button"
                  onClick={startDigitVerification}
                  disabled={uploadingIdx === 100 || !diditAvailable}
                  style={{
                    width: "100%", minHeight: 52, padding: "14px 16px", borderRadius: 12, border: "none",
                    background: !diditAvailable ? "#676064" : GOLD,
                    color: !diditAvailable ? "#e7e0ea" : "#080808",
                    fontSize: 15, fontWeight: 800,
                    cursor: uploadingIdx === 100 || !diditAvailable ? "not-allowed" : "pointer",
                    marginBottom: 14,
                  }}
                >
                  {uploadingIdx === 100
                    ? "Iniciando verificação..."
                    : diditPending
                      ? form.verificationUrl ? "Retomar verificação" : "Verificação em análise"
                      : diditRejected && diditRetryAllowed
                        ? "Tentar novamente"
                        : "Verificar minha identidade"}
                </button>

                {diditPending && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
                    Verificação em análise
                    <span style={{ display: "block", color: "#d8cfdd", fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                      Seu cadastro ainda não será considerado verificado até recebermos o resultado final da Didit.
                    </span>
                  </div>
                )}

                {diditRejected && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ff8b8b", fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
                    Não foi possível concluir sua verificação de identidade.
                    {diditRetryAllowed && <span style={{ display: "block", color: "#d8cfdd", fontSize: 12, fontWeight: 500, marginTop: 4 }}>Você pode tentar novamente pelo botão acima.</span>}
                  </div>
                )}

                {!diditAvailable && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: "#e8b8ff", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                    A verificação Didit está temporariamente indisponível. Seu cadastro permanece salvo; tente novamente em alguns minutos.
                  </div>
                )}

                {diditMessage && !diditPending && !diditRejected && (
                  <p style={{ margin: "10px 0 0", color: "#d8cfdd", fontSize: 12 }}>{diditMessage}</p>
                )}
              </>
            )}
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ETAPA 9 — REVISÃO E ENVIO
      ══════════════════════════════════════════════ */}
      {step === 8 && (
        <div>
          {/* Resumo final antes de enviar */}
          <Section title="Resumo do perfil">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Nome artístico", form.displayName || "—"],
                ["Categoria", form.escortCategory || "—"],
                ["Cidade", `${form.city}${form.state ? ", " + form.state : ""}` || "—"],
                ["Foto principal", form.mainPhotoUrl ? "✓ Enviada" : "Não enviada"],
                ["Fotos na galeria", `${form.galleryUrls.length} foto(s)`],
                ["Identidade", diditApproved ? "✓ Verificada pela Didit" : "Não verificada"],
                ["WhatsApp", form.whatsapp || "—"],
              ].map(([label, value]) => (
                <div className="model-summary-tile" key={label} style={{ background: "#080808", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#aaa0b2", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: String(value).startsWith("✓") ? "#22c55e" : "#fcf7ff", fontWeight: String(value).startsWith("✓") ? 700 : 400 }}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ padding: "14px 18px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 10, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#b4adb0", lineHeight: 1.7 }}>
              Ao enviar, você confirma ter <strong>18 anos ou mais</strong> e concorda com os Termos de Uso da plataforma. Seu perfil fica em análise por até <strong>3 dias úteis</strong> e só ficará visível após aprovação.
            </p>
          </div>
        </div>
      )}

      {/* ── Navegação entre etapas ── */}
      </div>

      <div className="model-step-actions" style={{ display: "flex", justifyContent: "space-between", marginTop: 36, paddingTop: 20, borderTop: `1px solid ${GOLD_DIM}` }}>
        <button onClick={back} disabled={step === 0}
          style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${step === 0 ? "#251f20" : GOLD_MID}`, borderRadius: 10, color: step === 0 ? "#676064" : GOLD, fontSize: 14, cursor: step === 0 ? "default" : "pointer", fontWeight: 600 }}>
          ← Voltar
        </button>

        {!isLast ? (
          <button onClick={next}
            style={{ padding: "12px 32px", background: GOLD, border: "none", borderRadius: 10, color: "#080808", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Continuar →
          </button>
        ) : (
          <button onClick={submit} disabled={loading || emailVerified === false || !diditApproved}
            style={{ padding: "12px 32px", background: loading || emailVerified === false || !diditApproved ? "#65009b" : GOLD, border: "none", borderRadius: 10, color: "#080808", fontSize: 14, fontWeight: 800, cursor: loading || emailVerified === false || !diditApproved ? "not-allowed" : "pointer" }}>
            {loading ? "Enviando..." : emailVerified === false ? "Confirme o email para enviar" : !diditApproved ? "Verifique sua identidade" : "Enviar cadastro para análise"}
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
          background: radial-gradient(circle at 16% 8%, rgba(183,44,255,0.20), transparent 31%), radial-gradient(circle at 88% 34%, rgba(101,0,155,0.16), transparent 36%), #080808;
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
          border: 1px solid rgba(183, 44, 255,0.30);
          border-radius: 999px;
          background: rgba(11,11,13,0.82);
          color: #d77bff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 36px rgba(0,0,0,0.24);
        }
        .model-flow-header button:last-child { width: auto; padding: 0 12px; color: #fff; font-size: 12px; }
        .model-flow-logo { display: grid; width: min(100%, 154px); place-items: center; justify-self: center; }
        .model-flow-logo img { display: block; width: 100%; height: auto; }
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
        .model-flow-page label, .model-flow-page [style*="uppercase"] { color: #d77bff !important; }
        .model-flow-page input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="range"]),
        .model-flow-page textarea,
        .model-flow-page select {
          min-height: 58px !important;
          border: 1px solid rgba(183, 44, 255,0.30) !important;
          border-radius: 18px !important;
          background: rgba(8, 8, 8,0.96) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #e1a6ff;
          font-size: 16px !important;
          padding: 15px 16px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important;
          scroll-margin-bottom: 160px;
        }
        .model-flow-page textarea { min-height: 154px !important; }
        .model-flow-page select { color-scheme: dark; }
        .model-flow-page select option { background: #111; color: #fff; }
        .model-flow-page input::placeholder, .model-flow-page textarea::placeholder { color: rgba(242, 220, 244,0.68) !important; -webkit-text-fill-color: rgba(242, 220, 244,0.68) !important; }
        .model-flow-page input:focus, .model-flow-page textarea:focus, .model-flow-page select:focus {
          border-color: rgba(225, 166, 255,0.82) !important;
          box-shadow: 0 0 0 4px rgba(183, 44, 255,0.14) !important;
        }
        .model-flow-page input:-webkit-autofill,
        .model-flow-page input:-webkit-autofill:hover,
        .model-flow-page input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          box-shadow: 0 0 0 1000px #080808 inset !important;
          transition: background-color 9999s ease-out 0s;
        }
        .model-flow-page input[type="checkbox"],
        .model-flow-page input[type="radio"] {
          width: 21px !important;
          height: 21px !important;
          min-width: 21px;
          flex: 0 0 auto;
          accent-color: #b72cff;
        }
        .model-flow-page input[type="checkbox"]:focus-visible,
        .model-flow-page input[type="radio"]:focus-visible,
        .model-flow-page button:focus-visible {
          outline: 3px solid rgba(225, 166, 255, .65) !important;
          outline-offset: 3px !important;
        }
        .model-flow-page button { border-radius: 18px !important; }
        .model-flow-page button:disabled {
          opacity: 0.72 !important;
          color: #ded8da !important;
          cursor: not-allowed !important;
        }
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
          border-color: rgba(183, 44, 255,0.30) !important;
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
          color: #fff !important;
          border-color: rgba(225, 166, 255,0.90) !important;
          background: linear-gradient(135deg, #d77bff, #8f1fd1 54%, #65009b) !important;
          box-shadow: 0 12px 30px rgba(183, 44, 255,0.24), inset 0 1px 0 rgba(255,255,255,0.20) !important;
        }
        .model-tag[data-active="false"] {
          color: #d4d8df !important;
          border-color: rgba(183, 44, 255,0.30) !important;
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
          color: #fff;
          font-size: 11px;
          font-weight: 950;
        }
        .model-subsection-label {
          margin: 0 0 8px !important;
          color: #d77bff !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .whatsapp-field {
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(183, 44, 255,0.30);
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
          border-right: 1px solid rgba(183, 44, 255,0.22);
          color: #d77bff;
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
          background: linear-gradient(135deg, #16a34a, #b72cff);
          color: #fff;
          font-size: 10px;
          font-weight: 950;
        }
        .whatsapp-prefix strong { color: #d77bff; font-size: 13px; }
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
          border-color: rgba(225, 166, 255,0.82);
          box-shadow: 0 0 0 4px rgba(183, 44, 255,0.14);
        }
        .instagram-field {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(183, 44, 255,0.30);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          overflow: hidden;
        }
        .instagram-field > span {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(183, 44, 255,0.22);
          color: #d77bff;
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
          border-color: rgba(225, 166, 255,0.82);
          box-shadow: 0 0 0 4px rgba(183, 44, 255,0.14);
        }
        .money-field {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          min-height: 58px;
          border: 1px solid rgba(183, 44, 255,0.30);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          overflow: hidden;
        }
        .money-field > span {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(183, 44, 255,0.22);
          color: #d77bff;
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
          border-color: rgba(225, 166, 255,0.82);
          box-shadow: 0 0 0 4px rgba(183, 44, 255,0.14);
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
          border: 1px solid rgba(183, 44, 255,0.30);
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
          border: 1px solid rgba(183, 44, 255,0.30) !important;
          border-radius: 12px !important;
          background: rgba(183, 44, 255,0.12) !important;
          color: #d77bff !important;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 900;
        }
        .model-email-warning {
          box-shadow: 0 16px 40px rgba(0,0,0,.22);
        }
        .model-location-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(110px, .8fr);
          gap: 12px;
        }
        .model-location-grid > div:last-child { grid-column: 1 / -1; }
        .professional-city-autocomplete { position: relative; }
        .professional-city-autocomplete > input { width: 100%; min-height: 58px; padding: 12px 14px; border: 1px solid rgba(183,44,255,.28); border-radius: 16px; background: #080808; color: #fff; font-size: 14px; outline: none; }
        .professional-city-autocomplete ul { position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; right: 0; max-height: 260px; overflow-y: auto; margin: 0; padding: 6px; list-style: none; border: 1px solid var(--flow-border); border-radius: 14px; background: var(--flow-card); box-shadow: 0 18px 40px rgba(49,25,65,.18); }
        .professional-city-autocomplete li button { width: 100%; padding: 11px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--flow-text); text-align: left; cursor: pointer; }
        .professional-city-autocomplete li button:hover, .professional-city-autocomplete li button:focus { background: var(--flow-soft); outline: none; }
        .professional-city-autocomplete li strong, .professional-city-autocomplete li span { display: block; }
        .professional-city-autocomplete li span, .city-status { color: var(--flow-muted); font-size: 11px; }
        .city-status { display: block; margin-top: 6px; line-height: 1.4; }
        .model-measures-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) 1fr 1fr; gap: 12px; }
        .model-validation-summary, .model-field-error, .model-draft-warning { padding: 10px 12px; border: 1px solid #ca4555; border-radius: 12px; background: #fff2f4; color: #861d2a !important; font-size: 12px; line-height: 1.45; }
        .model-validation-summary { margin: 0 0 18px; }
        .model-field-error { margin: 10px 0 0; }
        .model-draft-warning { margin: 0 0 20px; }
        .model-email-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .model-email-actions input { min-width: 0; flex: 1 1 190px; padding: 10px 12px; border: 1px solid #c59bd8; border-radius: 10px; background: #fff; color: #171219; }
        .model-email-actions button { padding: 9px 12px; border: 0; border-radius: 10px; background: #7d179f; color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; }
        .model-email-actions button.secondary { border: 1px solid #c59bd8; background: #fff; color: #7d179f; }
        .model-email-actions button:disabled { opacity: .65; cursor: not-allowed; }
        .model-progress-card {
          margin-bottom: 30px !important;
          border: 1px solid rgba(183, 44, 255,0.28);
          border-radius: 20px;
          background: rgba(16,16,20,0.74);
          padding: 16px;
          box-shadow: 0 22px 60px rgba(0,0,0,0.26);
        }
        .model-progress-card > div:nth-child(2) {
          height: 5px !important;
          background: rgba(255,255,255,0.10) !important;
          overflow: hidden;
        }
        .model-progress-card > div:nth-child(2) > div { background: linear-gradient(90deg, #8f1fd1, #d77bff) !important; }
        .model-progress-card > div:nth-child(3) {
          gap: 8px !important;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .model-progress-card > div:nth-child(3)::-webkit-scrollbar { display: none; }
        .model-progress-card > div:nth-child(3) > div {
          flex: 0 0 58px !important;
          min-width: 58px !important;
        }
        .model-progress-card > div:nth-child(3) span {
          color: #aeb6c2 !important;
          line-height: 1.15 !important;
          white-space: normal !important;
          word-break: keep-all;
        }
        .model-step-bubbles {
          display: flex;
          width: 100%;
          gap: 8px;
          margin-top: 14px;
          padding: 0 6px 4px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          scroll-padding-inline: 8px;
          overscroll-behavior-x: contain;
        }
        .model-step-bubbles > div {
          scroll-snap-align: center;
        }
        .model-step-bubbles > div[data-current="true"] span {
          color: #e1a6ff !important;
          font-weight: 950 !important;
        }
        .model-step-bubbles > div[data-current="true"] button {
          transform: scale(1.08);
          box-shadow: 0 0 0 4px rgba(183, 44, 255,0.16), 0 12px 24px rgba(183, 44, 255,0.22) !important;
        }
        @media (max-width: 520px) {
          .model-measures-grid { grid-template-columns: 1fr 1fr; }
          .model-birth-date-field { grid-column: 1 / -1; }
          .birth-date-confirmed { width: 100%; }
          .model-step-bubbles {
            margin-left: -8px !important;
            margin-right: -8px !important;
            width: calc(100% + 16px);
            padding: 0 8px 4px !important;
          }
          .model-step-bubbles > div {
            flex: 0 0 64px !important;
            min-width: 64px !important;
          }
          .model-step-bubbles > div span {
            font-size: 8px !important;
          }
        }
        .model-step-content {
          min-width: 0;
          padding: 20px 16px;
          border: 1px solid rgba(183, 44, 255, .22);
          border-radius: 22px;
          background: rgba(13, 12, 16, .72);
          box-shadow: 0 24px 68px rgba(0, 0, 0, .25);
        }
        .model-step-content > div { min-width: 0; }
        .model-category-option {
          min-height: 58px;
          position: relative;
          flex-direction: row !important;
          justify-content: center;
          color: #e8e2eb !important;
        }
        .model-category-option[data-selected="true"] {
          border-color: #e1a6ff !important;
          background: linear-gradient(135deg, #c332ff, #7500ae) !important;
          color: #fff !important;
          box-shadow: 0 12px 28px rgba(183, 44, 255, .28);
        }
        .model-category-check {
          display: grid;
          width: 18px;
          height: 18px;
          place-items: center;
          border-radius: 999px;
          background: rgba(0, 0, 0, .22);
          color: #fff;
          font-size: 11px;
          font-weight: 950;
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
          border-top: 1px solid rgba(183, 44, 255,0.28) !important;
          background: rgba(5,5,5,0.96);
          display: flex !important;
          justify-content: space-between !important;
          gap: 14px !important;
          backdrop-filter: blur(16px);
        }
        .model-step-actions button { min-height: 56px !important; flex: 1; font-weight: 900 !important; }
        .model-step-actions button:first-child {
          border: 1px solid rgba(183, 44, 255,0.28) !important;
          background: rgba(16,16,20,0.88) !important;
          color: #fff !important;
        }
        .model-step-actions button:last-child {
          border: 0 !important;
          background: linear-gradient(135deg, #d77bff, #8f1fd1 45%, #65009b) !important;
          color: #fff !important;
          box-shadow: 0 18px 46px rgba(183, 44, 255,0.26) !important;
        }
        @media (max-width: 380px) {
          .model-step-content { padding-inline: 13px; }
          .model-category-grid { gap: 7px !important; }
          .model-category-option { padding-inline: 5px !important; font-size: 12px !important; }
        }
        @media (max-height: 620px) and (pointer: coarse) {
          .model-step-actions {
            position: sticky;
            left: auto;
            bottom: 0;
            width: calc(100% + 32px);
            margin: 28px -16px calc(-144px - env(safe-area-inset-bottom)) !important;
            transform: none;
          }
        }

        /* Tema claro oficial do onboarding. Mantido por último para impedir
           que estilos escuros legados disputem com os tokens globais. */
        .model-flow-page {
          --flow-brand: var(--brand-primary, #7d179f);
          --flow-brand-hover: var(--brand-primary-hover, #651080);
          --flow-soft: var(--brand-primary-soft, #f8eaff);
          --flow-page: var(--surface-light, #f8f7fb);
          --flow-card: var(--surface-card-light, #fff);
          --flow-text: var(--text-on-light, #141212);
          --flow-muted: var(--text-muted-on-light, #625c68);
          --flow-placeholder: var(--input-placeholder-light, #6f6875);
          --flow-border: var(--border-light, #d8c9df);
          background: radial-gradient(circle at 16% 8%, rgba(183,44,255,.09), transparent 31%), var(--flow-page) !important;
          color: var(--flow-text) !important;
        }
        .model-flow-page h1,
        .model-flow-page h2,
        .model-flow-page h3,
        .model-flow-page strong { color: var(--flow-text) !important; }
        .model-flow-page p { color: var(--flow-muted) !important; }
        .model-flow-page label,
        .model-flow-page [style*="uppercase"] { color: var(--flow-brand) !important; }
        .model-flow-header,
        .model-progress-card,
        .model-step-content,
        .model-info-panel,
        .model-status-panel,
        .model-summary-tile {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-text) !important;
          box-shadow: 0 16px 42px rgba(59,31,83,.09) !important;
        }
        .model-flow-header button {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-brand) !important;
          box-shadow: none !important;
        }
        .model-email-warning {
          border-color: #c59bd8 !important;
          background: var(--flow-soft) !important;
          color: var(--flow-text) !important;
        }
        .model-flow-page input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="range"]),
        .model-flow-page textarea,
        .model-flow-page select,
        .whatsapp-field,
        .instagram-field,
        .money-field,
        .birth-date-confirmed {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-text) !important;
          -webkit-text-fill-color: var(--flow-text) !important;
          color-scheme: light;
          box-shadow: none !important;
        }
        .model-flow-page input::placeholder,
        .model-flow-page textarea::placeholder,
        .money-field input::placeholder {
          color: var(--flow-placeholder) !important;
          -webkit-text-fill-color: var(--flow-placeholder) !important;
          opacity: 1 !important;
        }
        .model-flow-page input:-webkit-autofill,
        .model-flow-page input:-webkit-autofill:hover,
        .model-flow-page input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--flow-text) !important;
          box-shadow: 0 0 0 1000px var(--flow-card) inset !important;
        }
        .model-flow-page input:focus,
        .model-flow-page textarea:focus,
        .model-flow-page select:focus,
        .whatsapp-field:focus-within,
        .instagram-field:focus-within,
        .money-field:focus-within {
          border-color: var(--flow-brand) !important;
          box-shadow: 0 0 0 4px rgba(125,23,159,.14) !important;
        }
        .model-tag,
        .model-category-option {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-text) !important;
          box-shadow: none !important;
        }
        .model-tag[data-active="true"],
        .model-category-option[data-selected="true"] {
          border-color: var(--flow-brand) !important;
          background: var(--flow-brand) !important;
          color: #fff !important;
          box-shadow: 0 10px 24px rgba(125,23,159,.22) !important;
        }
        .model-flow-page .model-step-content .model-tag[data-active="false"],
        .model-flow-page .model-step-content .model-chip-group button:not([data-active="true"]) {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-text) !important;
        }
        .model-info-panel [style*="color: rgb(252, 247, 255)"],
        .model-info-panel [style*="color: #fcf7ff"],
        .model-summary-tile [style*="color: rgb(252, 247, 255)"],
        .model-summary-tile [style*="color: #fcf7ff"] {
          color: var(--flow-text) !important;
        }
        .model-info-panel [style*="color: rgb(180, 173, 176)"],
        .model-info-panel [style*="color: #b4adb0"],
        .model-summary-tile [style*="color: rgb(170, 160, 178)"],
        .model-summary-tile [style*="color: #aaa0b2"],
        .model-summary-tile [style*="color: rgb(180, 173, 176)"],
        .model-summary-tile [style*="color: #b4adb0"] {
          color: var(--flow-muted) !important;
        }
        .model-summary-tile [style*="color: rgb(34, 197, 94)"],
        .model-summary-tile [style*="color: #22c55e"] {
          color: #17733b !important;
        }
        .model-flow-page .model-summary-tile > div:last-child {
          color: var(--flow-text) !important;
        }
        .model-step-bubbles button {
          border: 1px solid var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: var(--flow-muted) !important;
        }
        .model-step-bubbles > div[data-current="true"] button,
        .model-step-bubbles button:not(:disabled) {
          border-color: var(--flow-brand) !important;
          background: var(--flow-brand) !important;
          color: #fff !important;
        }
        .model-step-bubbles span { color: var(--flow-muted) !important; }
        .model-step-bubbles > div[data-current="true"] span { color: var(--flow-brand) !important; }
        .model-step-actions {
          border-top-color: var(--flow-border) !important;
          background: rgba(255,255,255,.97) !important;
          box-shadow: 0 -12px 34px rgba(59,31,83,.1);
        }
        .model-step-actions button:first-child {
          border-color: var(--flow-border) !important;
          background: var(--flow-card) !important;
          color: #4e4652 !important;
        }
        .model-step-actions button:last-child {
          background: var(--flow-brand) !important;
          color: #fff !important;
          box-shadow: 0 12px 30px rgba(125,23,159,.23) !important;
        }
        .model-step-actions button:disabled {
          border-color: #cfc6d2 !important;
          background: #e9e4eb !important;
          color: #5f5962 !important;
          opacity: 1 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
