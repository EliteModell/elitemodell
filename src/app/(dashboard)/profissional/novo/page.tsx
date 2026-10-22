"use client";
/* eslint-disable @next/next/no-img-element -- preview local/private before moderation */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, LockKeyhole, MapPin, ShieldCheck, Sparkles, Upload } from "lucide-react";
import toast from "react-hot-toast";
import ProfessionalCityAutocomplete from "@/components/professional-onboarding/ProfessionalCityAutocomplete";
import { isProfessionalDisplayNameReady, professionalDisplayNameForEditing } from "@/lib/professional-display-name";
import styles from "./page.module.css";

type FormState = { displayName: string; escortCategory: string; genderIdentity: string; genderSelfDescription: string; transIdentity: string; city: string; state: string; placeId: string; attendanceTypes: string[]; pricePerHour: string; bio: string; mainPhotoUrl: string; kycSessionId: string; kycStatus: string };
type UserResponse = { professional?: { status?: string; registrationSubmittedAt?: string | null; displayName?: string; escortCategory?: string | null; genderIdentity?: string | null; genderSelfDescription?: string | null; transIdentity?: string | null; city?: string; state?: string; placeId?: string | null; attendanceTypes?: string[]; pricePerHour?: number | null; bio?: string; kycStatus?: string; photos?: Array<{ url: string; cover: boolean }> } | null };
type DiditResponse = { available?: boolean; sessionId?: string | null; status?: string; retryAllowed?: boolean; message?: string | null; url?: string | null; error?: string };

const STEPS = ["Dados básicos", "Identidade", "Atendimento", "Seu perfil", "Revisão"];
const STORAGE_KEY = "elitemodell.professional.simple-onboarding.v1";
const STEP_STORAGE_KEY = "elitemodell.professional.simple-onboarding.step.v1";
const REQUIRED_NAME_ERROR = "Informe seu nome profissional.";
const INVALID_NAME_ERROR = "Esse nome não pode ser usado. Escolha outro nome profissional.";
const initialForm: FormState = { displayName: "", escortCategory: "", genderIdentity: "", genderSelfDescription: "", transIdentity: "", city: "", state: "", placeId: "", attendanceTypes: [], pricePerHour: "", bio: "", mainPhotoUrl: "", kycSessionId: "", kycStatus: "NOT_STARTED" };

function moneyNumber(value: string) { const parsed = Number(value.replace(/[^\d,]/g, "").replace(",", ".")); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
function errorMessage(data: unknown, fallback: string) { return data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : fallback; }
function isDisplayNameError(message: string) { return message === REQUIRED_NAME_ERROR || message === INVALID_NAME_ERROR; }
function inferredResumeStep(form: FormState) {
  if (form.displayName.trim().length < 2 || !form.genderIdentity || !form.transIdentity) return 0;
  if (form.mainPhotoUrl && moneyNumber(form.pricePerHour)) return 4;
  if (form.city.trim().length >= 2 && form.state.length === 2 && form.attendanceTypes.length) return 3;
  return 1;
}

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const diditStarting = useRef(false);
  const saveInFlight = useRef(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedIdentityStatus, setSubmittedIdentityStatus] = useState("NOT_STARTED");
  const [diditAvailable, setDiditAvailable] = useState(true);
  const [diditUrl, setDiditUrl] = useState("");
  const [diditMessage, setDiditMessage] = useState<string | null>(null);
  const [diditRetryAllowed, setDiditRetryAllowed] = useState(false);
  const [preview, setPreview] = useState("");
  const [stepError, setStepError] = useState("");
  const [needsDisplayNameCorrection, setNeedsDisplayNameCorrection] = useState(false);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setStepError("");
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const refreshDidit = useCallback(async () => {
    const response = await fetch("/api/didit/session", { cache: "no-store" });
    if (response.status === 401) { router.replace("/login?returnUrl=/profissional/novo"); return; }
    const data = await response.json().catch(() => ({})) as DiditResponse;
    if (!response.ok) return;
    setDiditAvailable(data.available !== false); setDiditUrl(data.url ?? ""); setDiditMessage(data.message ?? null); setDiditRetryAllowed(Boolean(data.retryAllowed));
    setForm((current) => ({ ...current, kycSessionId: data.sessionId ?? current.kycSessionId, kycStatus: data.status ?? current.kycStatus }));
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      if (response.status === 401) { router.replace("/login?returnUrl=/profissional/novo"); return; }
      const user = await response.json() as UserResponse;
      if (cancelled) return;
      const professional = user.professional;
      if (!professional) { toast.error("Não foi possível localizar seu cadastro profissional. Confirme o telefone novamente."); router.replace("/cadastro/acompanhante"); return; }
      let local: Partial<FormState> = {};
      let persistedStep: number | null = null;
      try {
        const persisted = window.localStorage.getItem(STORAGE_KEY);
        local = persisted ? JSON.parse(persisted) as Partial<FormState> : {};
        const storedStepValue = window.localStorage.getItem(STEP_STORAGE_KEY);
        const storedStep = storedStepValue === null ? Number.NaN : Number(storedStepValue);
        persistedStep = Number.isInteger(storedStep) && storedStep >= 0 && storedStep < STEPS.length ? storedStep : null;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STEP_STORAGE_KEY);
      }
      const mainPhoto = professional.photos?.find((photo) => photo.cover)?.url ?? professional.photos?.[0]?.url ?? "";
      const legacyIdentity = ["MULHER", "HOMEM"].includes(professional.escortCategory ?? "") ? professional.escortCategory ?? "" : "";
      const legacyTransIdentity = professional.escortCategory === "TRANS" ? "SIM" : "";
      const restoredForm = { ...initialForm, displayName: professional.displayName ?? "", escortCategory: professional.escortCategory ?? "", genderIdentity: professional.genderIdentity ?? legacyIdentity, genderSelfDescription: professional.genderSelfDescription ?? "", transIdentity: professional.transIdentity ?? legacyTransIdentity, city: professional.city ?? "", state: professional.state ?? "", placeId: professional.placeId ?? "", attendanceTypes: professional.attendanceTypes ?? [], pricePerHour: professional.pricePerHour ? String(professional.pricePerHour) : "", bio: professional.bio ?? "", mainPhotoUrl: mainPhoto, kycStatus: professional.kycStatus ?? "NOT_STARTED", ...local };
      const editableDisplayName = professionalDisplayNameForEditing(restoredForm.displayName);
      setNeedsDisplayNameCorrection(Boolean(restoredForm.displayName.trim()) && !editableDisplayName);
      restoredForm.displayName = editableDisplayName;
      setForm(restoredForm);
      setStep(persistedStep ?? inferredResumeStep(restoredForm));
      setPreview(mainPhoto); setSubmitted(Boolean(professional.registrationSubmittedAt)); setSubmittedIdentityStatus(professional.kycStatus ?? "NOT_STARTED"); setReady(true); await refreshDidit();
    }
    void load(); return () => { cancelled = true; };
  }, [refreshDidit, router]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    window.localStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [form, ready, step]);
  useEffect(() => {
    if (!ready || step !== 1 || form.kycStatus === "APPROVED") return;
    const timer = window.setInterval(() => {
      void refreshDidit();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [form.kycStatus, ready, refreshDidit, step]);

  function validation(target = step) {
    if (target === 0) { if (!form.displayName.trim()) return REQUIRED_NAME_ERROR; if (!isProfessionalDisplayNameReady(form.displayName)) return INVALID_NAME_ERROR; if (!form.genderIdentity) return "Informe como você se identifica."; if (form.genderIdentity === "AUTODESCRICAO" && !form.genderSelfDescription.trim()) return "Conte brevemente como você se identifica."; if (!form.transIdentity) return "Responda à pergunta sobre identidade trans."; }
    if (target === 2) { if (form.city.trim().length < 2 || form.state.length !== 2) return "Selecione sua cidade principal de atendimento."; if (!form.attendanceTypes.length) return "Escolha presencial, virtual ou as duas modalidades."; }
    if (target === 3) { if (!moneyNumber(form.pricePerHour)) return "Informe seu valor inicial por hora."; if (!form.mainPhotoUrl) return "Adicione uma foto principal para análise."; }
    return null;
  }

  async function save(target = step) {
    if (saveInFlight.current) return false;
    const issue = validation(target); if (issue) { setStepError(issue); toast.error(issue); return false; }
    if (target === 1 || target === 4) { setStepError(""); return true; }
    saveInFlight.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/professionals/draft", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: target, flow: "simplified-v1", form }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { const message = "Sua sessão expirou. Entre novamente para continuar o cadastro."; setStepError(message); toast.error(message); return false; }
      if (!response.ok) throw new Error(errorMessage(data, "Não foi possível salvar esta etapa."));
      setStepError(""); return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar.";
      setStepError(message); toast.error(message); return false;
    } finally { saveInFlight.current = false; setSaving(false); }
  }

  async function next() { if (!(await save(step))) return; setStep((current) => Math.min(current + 1, STEPS.length - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function startDidit() {
    if (diditStarting.current) return; diditStarting.current = true; setSaving(true);
    try {
      const response = await fetch("/api/didit/session", { method: "POST" }); const data = await response.json().catch(() => ({})) as DiditResponse;
      if (!response.ok) throw new Error(data.error ?? "Não foi possível iniciar a verificação.");
      setForm((current) => ({ ...current, kycSessionId: data.sessionId ?? "", kycStatus: data.status ?? "PENDING" })); setDiditUrl(data.url ?? "");
      if (data.url) window.location.assign(data.url); else toast.success("Verificação iniciada. Aguarde a atualização do status.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a verificação."); } finally { diditStarting.current = false; setSaving(false); }
  }

  async function uploadPhoto(file: File) {
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) { toast.error("Use uma foto JPG, PNG, WebP ou HEIC."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("A foto deve ter no máximo 20 MB."); return; }
    const localPreview = URL.createObjectURL(file); setPreview(localPreview); setUploading(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("contentDeclarationAccepted", "true");
      const response = await fetch("/api/upload?folder=profiles/main", { method: "POST", body }); const data = await response.json().catch(() => ({})) as { url?: string; path?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar a foto."); const reference = data.url ?? data.path; if (!reference) throw new Error("Não foi possível confirmar o recebimento da foto.");
      setField("mainPhotoUrl", reference); toast.success("Foto recebida com segurança.");
    } catch (error) { setPreview(form.mainPhotoUrl); toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto."); } finally { setUploading(false); }
  }

  async function submit() {
    for (const target of [0, 1, 2, 3]) { const issue = validation(target); if (issue) { setStep(target); setStepError(issue); toast.error(issue); return; } }
    setSubmitting(true);
    try {
      const payload = { displayName: form.displayName.trim(), escortCategory: form.genderIdentity, genderIdentity: form.genderIdentity, genderSelfDescription: form.genderIdentity === "AUTODESCRICAO" ? form.genderSelfDescription.trim() : undefined, transIdentity: form.transIdentity, city: form.city.trim(), state: form.state, placeId: form.placeId || undefined, attendanceTypes: form.attendanceTypes, pricePerHour: moneyNumber(form.pricePerHour), priceMin: moneyNumber(form.pricePerHour), bio: form.bio.trim(), image: form.mainPhotoUrl, galleryUrls: [] };
      const response = await fetch("/api/professionals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})) as { error?: string; identityStatus?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar seu cadastro."); window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(STEP_STORAGE_KEY); setStepError(""); setSubmittedIdentityStatus(data.identityStatus ?? form.kycStatus); setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível enviar seu cadastro."; setStepError(message); toast.error(message); } finally { setSubmitting(false); }
  }

  if (!ready) return <main className={styles.loading} aria-label="Carregando cadastro"><span /></main>;
  if (submitted) { const identityApproved = submittedIdentityStatus === "APPROVED"; const identityRejected = submittedIdentityStatus === "REJECTED"; return <main className={styles.page}><section className={styles.successCard}><span className={styles.successIcon}><Check size={38} /></span><p className={styles.eyebrow}>Cadastro recebido</p><h1>Cadastro recebido com sucesso!</h1><p>Suas informações foram salvas.</p><div className={styles.deadline}><Clock3 size={20} /><span>Nossa equipe fará a análise dos requisitos do seu perfil. O prazo previsto é de até <strong>2 dias</strong> após o recebimento das verificações obrigatórias.</span></div><p>Você pode acompanhar seu cadastro e completar outras informações pelo painel.</p>{!identityApproved && <div className={identityRejected ? styles.identityRejected : styles.identityPending}><ShieldCheck size={20} /><p><strong>{identityRejected ? "Sua verificação de identidade precisa de correção." : "Sua verificação de identidade ainda está em andamento."}</strong><br />{identityRejected ? "Abra a etapa de identidade para consultar a orientação e tentar novamente quando permitido." : "Avisaremos quando houver uma atualização."} Seu perfil não ficará público enquanto a verificação e a aprovação não forem concluídas.</p></div>}<button type="button" onClick={() => router.replace("/profissional/analise")}>Acompanhar cadastro <ChevronRight size={19} /></button></section></main>; }

  const progress = ((step + 1) / STEPS.length) * 100; const diditApproved = form.kycStatus === "APPROVED"; const diditPending = ["PENDING", "DIDIT_PENDING", "IN_REVIEW", "IN_PROGRESS"].includes(form.kycStatus); const diditRejected = form.kycStatus === "REJECTED";
  return <main className={styles.page}>
    <header className={styles.header}><button type="button" aria-label="Voltar" onClick={() => step ? setStep(step - 1) : router.push("/")}><ChevronLeft /></button><Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={220} height={72} priority /><span>Salvo automaticamente</span></header>
    <section className={styles.progress} aria-label={`Etapa ${step + 1} de ${STEPS.length}`}><div><span>Etapa {step + 1} de {STEPS.length}</span><strong>{STEPS[step]}</strong></div><div className={styles.track}><span style={{ width: `${progress}%` }} /></div></section>
    <section className={styles.card}>
      {step === 0 && <div className={styles.stage}><span className={styles.stageIcon}><Sparkles /></span><p className={styles.eyebrow}>Vamos começar</p><h1>Como você quer aparecer?</h1><p className={styles.intro}>Só precisamos do essencial agora. Você poderá completar os detalhes depois.</p>{needsDisplayNameCorrection ? <p className={styles.nameCorrectionNotice}>Seu cadastro ainda está com um nome genérico. Escolha abaixo o nome que deseja mostrar aos clientes para continuar.</p> : null}<label><span className={styles.fieldPrompt}>Qual nome você quer mostrar aos clientes? <span className={styles.requiredMark} aria-hidden="true">*</span></span><small className={styles.fieldHelp}>Escolha seu nome profissional. É esse nome que aparecerá no seu perfil e nas buscas da Elite Modell. Não precisa ser seu nome de documento.</small><input autoFocus required value={form.displayName} onChange={(e) => { setNeedsDisplayNameCorrection(false); setField("displayName", e.target.value); }} placeholder="Ex.: Gabriella, Mel, Alice..." autoComplete="nickname" aria-invalid={isDisplayNameError(stepError)} aria-describedby={isDisplayNameError(stepError) ? "professional-name-error" : undefined} />{isDisplayNameError(stepError) ? <span id="professional-name-error" className={styles.fieldError} role="alert">{stepError}</span> : null}</label><fieldset><legend>Como você se identifica?</legend><div className={`${styles.options} ${styles.identityOptions}`}>{[["MULHER", "Mulher"], ["HOMEM", "Homem"], ["NAO_BINARIO", "Não binário"], ["AUTODESCRICAO", "Prefiro me autodescrever"]].map(([value, label]) => <button type="button" key={value} aria-pressed={form.genderIdentity === value} onClick={() => { setField("genderIdentity", value); setField("escortCategory", value); }}>{label}</button>)}</div>{form.genderIdentity === "AUTODESCRICAO" && <label className={styles.selfDescription}>Como você se descreve?<input value={form.genderSelfDescription} onChange={(e) => setField("genderSelfDescription", e.target.value.slice(0, 80))} placeholder="Escreva com suas palavras" /></label>}</fieldset><fieldset><legend>Você se identifica como pessoa trans?</legend><div className={styles.options}>{[["SIM", "Sim"], ["NAO", "Não"], ["PREFIRO_NAO_INFORMAR", "Prefiro não informar"]].map(([value, label]) => <button type="button" key={value} aria-pressed={form.transIdentity === value} onClick={() => setField("transIdentity", value)}>{label}</button>)}</div></fieldset><div className={styles.note}><LockKeyhole size={18} /><span>Essas respostas são autodeclaradas, não interferem na validação documental e não serão exibidas sem transparência e escolha.</span></div></div>}
      {step === 1 && <div className={styles.stage}><span className={styles.stageIcon}><ShieldCheck /></span><p className={styles.eyebrow}>Segurança e maioridade</p><h1>Confirme sua identidade</h1><p className={styles.intro}>A Didit verificará seu documento, selfie, reconhecimento facial e prova de vida. Você pode continuar preenchendo o cadastro enquanto o resultado é analisado.</p><div className={styles.privacyList}><p><Check /> Seus documentos não ficam públicos</p><p><Check /> A maioridade precisa ser confirmada</p><p><Check /> Uma sessão em andamento pode ser retomada</p></div>{diditApproved ? <div className={styles.approved}><Check /> Identidade e maioridade confirmadas automaticamente pela decisão oficial da Didit</div> : <div className={styles.diditBox}><strong>{diditPending ? "Verificação de identidade em análise" : diditRejected ? "Precisamos corrigir a verificação" : "Verifique quando estiver pronta"}</strong><p>{diditMessage ?? (diditPending ? "A Didit ainda está analisando as informações. Você já pode continuar o cadastro; não é necessário repetir o processo." : "Tenha um documento com foto em mãos e faça a verificação em um ambiente bem iluminado.")}</p>{(!diditPending || diditUrl) && <button type="button" disabled={!diditAvailable || saving || (diditRejected && !diditRetryAllowed)} onClick={startDidit}>{saving ? "Preparando..." : diditUrl && diditPending ? "Retomar verificação" : diditRejected ? "Tentar novamente" : "Verificar minha identidade"}</button>}<small>Você pode avançar agora. O perfil continuará privado até a identidade e a análise administrativa serem aprovadas.</small></div>}</div>}
      {step === 2 && <div className={styles.stage}><span className={styles.stageIcon}><MapPin /></span><p className={styles.eyebrow}>Onde você atende</p><h1>Sua cidade e modalidade</h1><p className={styles.intro}>Não pedimos seu endereço residencial. Informe somente a cidade que aparecerá no perfil.</p><label>Cidade principal<ProfessionalCityAutocomplete city={form.city} state={form.state} placeId={form.placeId} onChange={(value) => setForm((current) => ({ ...current, ...value }))} /></label>{form.state && <p className={styles.cityChosen}><Check size={16} /> {form.city}, {form.state}</p>}<fieldset><legend>Como você atende?</legend><div className={styles.options}>{[["Presencial", "Presencial"], ["Atendimento virtual/online", "Virtual"]].map(([value, label]) => { const active = form.attendanceTypes.includes(value); return <button type="button" key={value} aria-pressed={active} onClick={() => setField("attendanceTypes", active ? form.attendanceTypes.filter((item) => item !== value) : [...form.attendanceTypes, value])}>{active && <Check size={16} />}{label}</button>; })}</div><small>Você pode selecionar as duas opções.</small></fieldset></div>}
      {step === 3 && <div className={styles.stage}><span className={styles.stageIcon}><Upload /></span><p className={styles.eyebrow}>Seu perfil inicial</p><h1>Uma foto e seu valor</h1><p className={styles.intro}>Mais fotos, serviços, agenda e tabela completa poderão ser adicionados depois.</p><label>Valor inicial por hora<div className={styles.money}><span>R$</span><input inputMode="decimal" value={form.pricePerHour} onChange={(e) => setField("pricePerHour", e.target.value.replace(/[^\d,]/g, ""))} placeholder="300" /></div></label><label>Descrição breve <small>(opcional)</small><textarea value={form.bio} onChange={(e) => setField("bio", e.target.value.slice(0, 500))} placeholder="Conte um pouco sobre você e seu atendimento" rows={4} /><span className={styles.counter}>{form.bio.length}/500</span></label><div><span className={styles.fieldLabel}>Foto principal</span><input ref={fileRef} className={styles.hiddenFile} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => e.target.files?.[0] && void uploadPhoto(e.target.files[0])} />{preview || form.mainPhotoUrl ? <button type="button" className={styles.photoPreview} onClick={() => fileRef.current?.click()}><img src={preview || form.mainPhotoUrl} alt="Prévia da foto principal" /><span>{uploading ? "Enviando..." : "Trocar foto"}</span></button> : <button type="button" className={styles.upload} disabled={uploading} onClick={() => fileRef.current?.click()}><Upload /><strong>{uploading ? "Enviando foto..." : "Adicionar foto principal"}</strong><small>JPG, PNG, WebP ou HEIC · até 20 MB</small></button>}</div><div className={styles.note}><ShieldCheck size={18} /><span>A foto passa pela análise de segurança e moderação antes de qualquer publicação.</span></div></div>}
      {step === 4 && <div className={styles.stage}><span className={styles.stageIcon}><Check /></span><p className={styles.eyebrow}>Quase pronto</p><h1>Revise e envie</h1><p className={styles.intro}>Seu perfil não será publicado automaticamente. A equipe fará a análise antes.</p><div className={styles.summary}><button type="button" onClick={() => setStep(0)}><span>Perfil</span><strong>{form.displayName} · {form.escortCategory}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(1)}><span>Identidade</span><strong className={diditApproved ? styles.ok : ""}>{diditApproved ? "Verificada" : "Pendente"}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(2)}><span>Atendimento</span><strong>{form.city}, {form.state} · {form.attendanceTypes.length === 2 ? "Presencial e virtual" : form.attendanceTypes[0]}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(3)}><span>Perfil inicial</span><strong>R$ {form.pricePerHour}/h · Foto adicionada</strong><ChevronRight /></button></div><div className={styles.reviewNotice}><ShieldCheck /><p><strong>O que acontece agora?</strong><br />A equipe revisará identidade, maioridade, foto e informações. Detalhes adicionais poderão ser preenchidos no painel e continuarão obrigatórios antes da publicação.</p></div></div>}
      {stepError && !isDisplayNameError(stepError) ? <p className={styles.formError} role="alert" aria-live="assertive">{stepError}</p> : null}
      <footer className={styles.actions}>{step > 0 && <button type="button" className={styles.secondary} onClick={() => { setStepError(""); setStep(step - 1); }}><ChevronLeft size={18} /> Voltar</button>}{step < 4 ? <button type="button" className={styles.primary} disabled={saving || uploading} onClick={next}>{saving ? "Salvando..." : "Continuar"}<ChevronRight size={19} /></button> : <button type="button" className={styles.primary} disabled={submitting} onClick={submit}>{submitting ? "Enviando..." : "Enviar informações"}<ChevronRight size={19} /></button>}</footer>
    </section><p className={styles.help}>Precisa de ajuda? <a href="mailto:suporte@elitemodell.com.br">Fale com o suporte</a></p>
  </main>;
}
