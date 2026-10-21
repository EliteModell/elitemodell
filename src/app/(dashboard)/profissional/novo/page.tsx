"use client";
/* eslint-disable @next/next/no-img-element -- preview local/private before moderation */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, LockKeyhole, MapPin, ShieldCheck, Sparkles, Upload } from "lucide-react";
import toast from "react-hot-toast";
import ProfessionalCityAutocomplete from "@/components/professional-onboarding/ProfessionalCityAutocomplete";
import styles from "./page.module.css";

type FormState = { displayName: string; escortCategory: string; city: string; state: string; placeId: string; attendanceTypes: string[]; pricePerHour: string; bio: string; mainPhotoUrl: string; kycSessionId: string; kycStatus: string };
type UserResponse = { professional?: { status?: string; displayName?: string; escortCategory?: string | null; city?: string; state?: string; placeId?: string | null; attendanceTypes?: string[]; pricePerHour?: number | null; bio?: string; kycStatus?: string; photos?: Array<{ url: string; cover: boolean }> } | null };
type DiditResponse = { available?: boolean; sessionId?: string | null; status?: string; retryAllowed?: boolean; message?: string | null; url?: string | null; error?: string };

const STEPS = ["Dados básicos", "Identidade", "Atendimento", "Seu perfil", "Revisão"];
const STORAGE_KEY = "elitemodell.professional.simple-onboarding.v1";
const initialForm: FormState = { displayName: "", escortCategory: "", city: "", state: "", placeId: "", attendanceTypes: [], pricePerHour: "", bio: "", mainPhotoUrl: "", kycSessionId: "", kycStatus: "NOT_STARTED" };

function moneyNumber(value: string) { const parsed = Number(value.replace(/[^\d,]/g, "").replace(",", ".")); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
function errorMessage(data: unknown, fallback: string) { return data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : fallback; }

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const diditStarting = useRef(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [diditAvailable, setDiditAvailable] = useState(true);
  const [diditUrl, setDiditUrl] = useState("");
  const [diditMessage, setDiditMessage] = useState<string | null>(null);
  const [diditRetryAllowed, setDiditRetryAllowed] = useState(false);
  const [preview, setPreview] = useState("");

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value })), []);

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
      try { const persisted = window.localStorage.getItem(STORAGE_KEY); local = persisted ? JSON.parse(persisted) as Partial<FormState> : {}; } catch { window.localStorage.removeItem(STORAGE_KEY); }
      const mainPhoto = professional.photos?.find((photo) => photo.cover)?.url ?? professional.photos?.[0]?.url ?? "";
      setForm({ ...initialForm, displayName: professional.displayName ?? "", escortCategory: professional.escortCategory ?? "", city: professional.city ?? "", state: professional.state ?? "", placeId: professional.placeId ?? "", attendanceTypes: professional.attendanceTypes ?? [], pricePerHour: professional.pricePerHour ? String(professional.pricePerHour) : "", bio: professional.bio ?? "", mainPhotoUrl: mainPhoto, kycStatus: professional.kycStatus ?? "NOT_STARTED", ...local });
      setPreview(mainPhoto); setSubmitted(professional.status === "PENDING_REVIEW"); setReady(true); await refreshDidit();
    }
    void load(); return () => { cancelled = true; };
  }, [refreshDidit, router]);

  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form, ready]);
  useEffect(() => {
    if (!ready || step !== 1 || form.kycStatus === "APPROVED") return;
    const timer = window.setInterval(() => {
      void refreshDidit();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [form.kycStatus, ready, refreshDidit, step]);

  function validation(target = step) {
    if (target === 0) { if (form.displayName.trim().length < 2) return "Informe seu nome profissional."; if (!form.escortCategory) return "Escolha como seu perfil será apresentado."; }
    if (target === 1 && form.kycStatus !== "APPROVED") return "Conclua a verificação de identidade para continuar.";
    if (target === 2) { if (form.city.trim().length < 2 || form.state.length !== 2) return "Selecione sua cidade principal de atendimento."; if (!form.attendanceTypes.length) return "Escolha presencial, virtual ou as duas modalidades."; }
    if (target === 3) { if (!moneyNumber(form.pricePerHour)) return "Informe seu valor inicial por hora."; if (!form.mainPhotoUrl) return "Adicione uma foto principal para análise."; }
    return null;
  }

  async function save(target = step) {
    const issue = validation(target); if (issue) { toast.error(issue); return false; }
    if (target === 1 || target === 4) return true;
    setSaving(true);
    try {
      const response = await fetch("/api/professionals/draft", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: target, flow: "simplified-v1", form }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(errorMessage(data, "Não foi possível salvar esta etapa.")); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); return false; } finally { setSaving(false); }
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
    for (const target of [0, 1, 2, 3]) { const issue = validation(target); if (issue) { setStep(target); toast.error(issue); return; } }
    setSubmitting(true);
    try {
      const payload = { displayName: form.displayName.trim(), escortCategory: form.escortCategory, city: form.city.trim(), state: form.state, placeId: form.placeId || undefined, attendanceTypes: form.attendanceTypes, pricePerHour: moneyNumber(form.pricePerHour), priceMin: moneyNumber(form.pricePerHour), bio: form.bio.trim(), image: form.mainPhotoUrl, galleryUrls: [], kycProvider: "DIDIT", kycSessionId: form.kycSessionId, kycStatus: form.kycStatus };
      const response = await fetch("/api/professionals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar seu cadastro."); window.localStorage.removeItem(STORAGE_KEY); setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar seu cadastro."); } finally { setSubmitting(false); }
  }

  if (!ready) return <main className={styles.loading} aria-label="Carregando cadastro"><span /></main>;
  if (submitted) return <main className={styles.page}><section className={styles.successCard}><span className={styles.successIcon}><Check size={38} /></span><p className={styles.eyebrow}>Cadastro recebido</p><h1>Cadastro enviado com sucesso!</h1><p>Recebemos suas informações. Nossa equipe fará a análise do seu cadastro.</p><div className={styles.deadline}><Clock3 size={20} /><span>O prazo previsto é de até <strong>2 dias</strong>.</span></div><p>Você poderá acompanhar o andamento pelo seu painel e complementar as informações do seu perfil.</p><button type="button" onClick={() => router.replace("/profissional/analise")}>Acompanhar análise <ChevronRight size={19} /></button></section></main>;

  const progress = ((step + 1) / STEPS.length) * 100; const diditApproved = form.kycStatus === "APPROVED"; const diditPending = ["PENDING", "DIDIT_PENDING", "IN_REVIEW", "IN_PROGRESS"].includes(form.kycStatus); const diditRejected = form.kycStatus === "REJECTED";
  return <main className={styles.page}>
    <header className={styles.header}><button type="button" aria-label="Voltar" onClick={() => step ? setStep(step - 1) : router.push("/")}><ChevronLeft /></button><Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={220} height={72} priority /><span>Salvo automaticamente</span></header>
    <section className={styles.progress} aria-label={`Etapa ${step + 1} de ${STEPS.length}`}><div><span>Etapa {step + 1} de {STEPS.length}</span><strong>{STEPS[step]}</strong></div><div className={styles.track}><span style={{ width: `${progress}%` }} /></div></section>
    <section className={styles.card}>
      {step === 0 && <div className={styles.stage}><span className={styles.stageIcon}><Sparkles /></span><p className={styles.eyebrow}>Vamos começar</p><h1>Como você quer aparecer?</h1><p className={styles.intro}>Só precisamos do essencial agora. Você poderá completar os detalhes depois.</p><label>Nome profissional<input autoFocus value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} placeholder="Como clientes verão seu nome" autoComplete="nickname" /></label><fieldset><legend>Identidade do perfil</legend><div className={styles.options}>{[["MULHER", "Mulher"], ["TRANS", "Trans"], ["HOMEM", "Homem"]].map(([value, label]) => <button type="button" key={value} aria-pressed={form.escortCategory === value} onClick={() => setField("escortCategory", value)}>{label}</button>)}</div></fieldset><div className={styles.note}><LockKeyhole size={18} /><span>Seus dados pessoais e documentos nunca aparecem no perfil público.</span></div></div>}
      {step === 1 && <div className={styles.stage}><span className={styles.stageIcon}><ShieldCheck /></span><p className={styles.eyebrow}>Segurança e maioridade</p><h1>Confirme sua identidade</h1><p className={styles.intro}>A Didit verificará seu documento, selfie, reconhecimento facial e prova de vida. Isso protege você e toda a comunidade.</p><div className={styles.privacyList}><p><Check /> Seus documentos não ficam públicos</p><p><Check /> A maioridade precisa ser confirmada</p><p><Check /> Você pode retomar se interromper</p></div>{diditApproved ? <div className={styles.approved}><Check /> Identidade e maioridade confirmadas</div> : <div className={styles.diditBox}><strong>{diditPending ? "Verificação em andamento" : diditRejected ? "Precisamos tentar novamente" : "Leva apenas alguns minutos"}</strong><p>{diditMessage ?? "Tenha um documento com foto em mãos e faça a verificação em um ambiente bem iluminado."}</p><button type="button" disabled={!diditAvailable || saving || (diditRejected && !diditRetryAllowed)} onClick={startDidit}>{saving ? "Preparando..." : diditUrl && diditPending ? "Retomar verificação" : diditRejected ? "Tentar novamente" : "Verificar minha identidade"}</button></div>}</div>}
      {step === 2 && <div className={styles.stage}><span className={styles.stageIcon}><MapPin /></span><p className={styles.eyebrow}>Onde você atende</p><h1>Sua cidade e modalidade</h1><p className={styles.intro}>Não pedimos seu endereço residencial. Informe somente a cidade que aparecerá no perfil.</p><label>Cidade principal<ProfessionalCityAutocomplete city={form.city} state={form.state} placeId={form.placeId} onChange={(value) => setForm((current) => ({ ...current, ...value }))} /></label>{form.state && <p className={styles.cityChosen}><Check size={16} /> {form.city}, {form.state}</p>}<fieldset><legend>Como você atende?</legend><div className={styles.options}>{[["Presencial", "Presencial"], ["Atendimento virtual/online", "Virtual"]].map(([value, label]) => { const active = form.attendanceTypes.includes(value); return <button type="button" key={value} aria-pressed={active} onClick={() => setField("attendanceTypes", active ? form.attendanceTypes.filter((item) => item !== value) : [...form.attendanceTypes, value])}>{active && <Check size={16} />}{label}</button>; })}</div><small>Você pode selecionar as duas opções.</small></fieldset></div>}
      {step === 3 && <div className={styles.stage}><span className={styles.stageIcon}><Upload /></span><p className={styles.eyebrow}>Seu perfil inicial</p><h1>Uma foto e seu valor</h1><p className={styles.intro}>Mais fotos, serviços, agenda e tabela completa poderão ser adicionados depois.</p><label>Valor inicial por hora<div className={styles.money}><span>R$</span><input inputMode="decimal" value={form.pricePerHour} onChange={(e) => setField("pricePerHour", e.target.value.replace(/[^\d,]/g, ""))} placeholder="300" /></div></label><label>Descrição breve <small>(opcional)</small><textarea value={form.bio} onChange={(e) => setField("bio", e.target.value.slice(0, 500))} placeholder="Conte um pouco sobre você e seu atendimento" rows={4} /><span className={styles.counter}>{form.bio.length}/500</span></label><div><span className={styles.fieldLabel}>Foto principal</span><input ref={fileRef} className={styles.hiddenFile} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => e.target.files?.[0] && void uploadPhoto(e.target.files[0])} />{preview || form.mainPhotoUrl ? <button type="button" className={styles.photoPreview} onClick={() => fileRef.current?.click()}><img src={preview || form.mainPhotoUrl} alt="Prévia da foto principal" /><span>{uploading ? "Enviando..." : "Trocar foto"}</span></button> : <button type="button" className={styles.upload} disabled={uploading} onClick={() => fileRef.current?.click()}><Upload /><strong>{uploading ? "Enviando foto..." : "Adicionar foto principal"}</strong><small>JPG, PNG, WebP ou HEIC · até 20 MB</small></button>}</div><div className={styles.note}><ShieldCheck size={18} /><span>A foto passa pela análise de segurança e moderação antes de qualquer publicação.</span></div></div>}
      {step === 4 && <div className={styles.stage}><span className={styles.stageIcon}><Check /></span><p className={styles.eyebrow}>Quase pronto</p><h1>Revise e envie</h1><p className={styles.intro}>Seu perfil não será publicado automaticamente. A equipe fará a análise antes.</p><div className={styles.summary}><button type="button" onClick={() => setStep(0)}><span>Perfil</span><strong>{form.displayName} · {form.escortCategory}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(1)}><span>Identidade</span><strong className={diditApproved ? styles.ok : ""}>{diditApproved ? "Verificada" : "Pendente"}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(2)}><span>Atendimento</span><strong>{form.city}, {form.state} · {form.attendanceTypes.length === 2 ? "Presencial e virtual" : form.attendanceTypes[0]}</strong><ChevronRight /></button><button type="button" onClick={() => setStep(3)}><span>Perfil inicial</span><strong>R$ {form.pricePerHour}/h · Foto adicionada</strong><ChevronRight /></button></div><div className={styles.reviewNotice}><ShieldCheck /><p><strong>O que acontece agora?</strong><br />A equipe revisará identidade, maioridade, foto e informações. Detalhes adicionais poderão ser preenchidos no painel e continuarão obrigatórios antes da publicação.</p></div></div>}
      <footer className={styles.actions}>{step > 0 && <button type="button" className={styles.secondary} onClick={() => setStep(step - 1)}><ChevronLeft size={18} /> Voltar</button>}{step < 4 ? <button type="button" className={styles.primary} disabled={saving || uploading || (step === 1 && !diditApproved)} onClick={next}>{saving ? "Salvando..." : "Continuar"}<ChevronRight size={19} /></button> : <button type="button" className={styles.primary} disabled={submitting} onClick={submit}>{submitting ? "Enviando..." : "Enviar para análise"}<ChevronRight size={19} /></button>}</footer>
    </section><p className={styles.help}>Precisa de ajuda? <a href="mailto:suporte@elitemodell.com.br">Fale com o suporte</a></p>
  </main>;
}
