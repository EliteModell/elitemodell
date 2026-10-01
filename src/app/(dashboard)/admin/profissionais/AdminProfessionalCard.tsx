/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { StatusPill, buttonStyle } from "../_components/AdminPrimitives";
import { AdminKycEvidence } from "./AdminKycEvidence";
import { professionalCompletion } from "@/lib/professional-completeness";
import { resolveProfessionalAccess } from "@/lib/professional-access-policy";

type AuditEntry = {
  id: string;
  action: string;
  reason: string | null;
  changes: unknown;
  actorIdentifier: string | null;
  timestamp: Date;
  admin: { name: string | null; email: string } | null;
};

export type AdminProfessionalRecord = {
  id: string; userId: string; slug: string; displayName: string; bio: string;
  city: string; state: string; bairro: string | null; region: string | null;
  address: string | null; placeId: string | null; latitude: number | null; longitude: number | null;
  phone: string | null; whatsapp: string | null; instagram: string | null; website: string | null;
  hidePhone: boolean; hideAge: boolean; listingPhoneUntil: Date | null;
  escortCategory: string | null; birthDate: Date | null; height: number | null;
  attendanceTypes: string[]; servesGenders: string[]; idiomas: string[];
  diasDisponiveis: string[]; horarioInicio: string | null; horarioFim: string | null;
  services: string[]; servicesNotOffered: string[]; amenities: string[];
  serviceCities: string[]; approximateLocation: string | null;
  priceMin: number | null; priceMax: number | null; price15min: number | null;
  price30min: number | null; pricePerHour: number | null; price2h: number | null;
  priceOvernight: number | null; priceWebcam: number | null; paymentMethods: string[];
  image: string | null; presentationVideoUrl: string | null;
  presentationVideoStatus: string; presentationVideoRejectReason: string | null;
  status: string; verified: boolean; docStatus: string; docFrenteUrl: string | null; docVersoUrl: string | null; verifStatus: string;
  verificationUrl: string | null; verificationType: string | null;
  kycProvider: string | null; kycSessionId: string | null; kycStatus: string;
  rejectReason: string | null; pauseUntil: Date | null; pauseReason: string | null;
  boostActive: boolean; boostUntil: Date | null; boostSource: string | null;
  freeAccessStartedAt: Date | null; freeAccessEndsAt: Date | null; accessGrandfathered: boolean;
  billingStatus: "PENDING_APPROVAL" | "TRIAL" | "ACTIVE" | "TRIAL_EXPIRED" | "PAST_DUE" | "CANCELED" | "GRANDFATHERED";
  subscriptionStartedAt: Date | null; subscriptionEndsAt: Date | null;
  profileViews: number; contactClicks: number; rating: number; totalReviews: number;
  registrationSubmittedAt: Date | null; completionRulesVersion: number;
  currentServiceCity: string | null; currentServiceState: string | null; currentServiceNeighborhood: string | null;
  additionalServiceNeighborhoods: string[]; locationUpdatedAt: Date | null; locationVerificationStatus: string;
  temporaryLocationFrom: Date | null; temporaryLocationUntil: Date | null;
  createdAt: Date; updatedAt: Date;
  submissionReceipt: { status: string; sentAt: Date | null; createdAt: Date; updatedAt: Date } | null;
  user: {
    name: string | null; email: string; phone: string | null; city: string | null; state: string | null;
    birthDate: Date | null; category: string | null; blocked: boolean; blockReason: string | null;
    blockedAt: Date | null; kycSubmittedAt: Date | null; kycReviewedAt: Date | null;
    kycRejectionReason: string | null; premiumUntil: Date | null; createdAt: Date; updatedAt: Date;
    uploadedAssets: unknown[];
  };
  photos: Array<{ id: string; url: string; cover: boolean; order: number; caption: string | null; createdAt: Date }>;
  specialties: Array<{ id: string; name: string }>;
  locationChanges: Array<{ id: string; fromCity: string | null; fromState: string | null; fromNeighborhood: string | null;
    toCity: string; toState: string; toNeighborhood: string | null; changeType: string; effectiveFrom: Date | null;
    effectiveUntil: Date | null; verificationStatus: string; riskReason: string | null; createdAt: Date }>;

};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Cadastro iniciado", PENDING_REVIEW: "Aguardando aprovação", CORRECTION_REQUIRED: "Correção solicitada", ACTIVE: "Aprovada",
  PAUSED: "Pausada", SUSPENDED: "Suspensa", REJECTED: "Reprovada",
};

const TECHNICAL_LABEL: Record<string, string> = {
  NOT_STARTED: "Não iniciada", NOT_SENT: "Não enviado", PENDING: "Pendente",
  PERSONA_PENDING: "Pendente na Persona", KYC_MANUAL_PENDENTE: "Análise manual pendente",
  NEEDS_REVIEW: "Revisão necessária", APPROVED: "Aprovado", REJECTED: "Reprovado", NONE: "Não enviado",
};

function technicalStatus(value?: string | null) {
  if (!value) return "Não informado";
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return TECHNICAL_LABEL[key] ?? value;
}

function providerLabel(provider?: string | null, sessionId?: string | null) {
  if (provider?.toUpperCase() === "DIDIT") return "Didit";
  if (provider?.toUpperCase() === "PERSONA" || sessionId?.startsWith("inq_")) return "Persona";
  return "Manual";
}

function date(value?: Date | null, withTime = false) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" }).format(value);
}

function age(value?: Date | null) {
  if (!value) return null;
  const now = new Date();
  let years = now.getFullYear() - value.getFullYear();
  if (now < new Date(now.getFullYear(), value.getMonth(), value.getDate())) years -= 1;
  return years;
}

function money(value?: number | null) {
  return value == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function moderationAction(entry?: AuditEntry) {
  if (!entry) return "Sem ação registrada";
  const changes = entry.changes && typeof entry.changes === "object" ? entry.changes as Record<string, unknown> : {};
  const reasonAction = entry.reason?.match(/^(?:professional|presentation-video):([A-Za-z]+)/)?.[1] ?? null;
  const explicit = typeof changes.moderationAction === "string" ? changes.moderationAction : reasonAction;
  const labels: Record<string, string> = {
    approve: "Aprovou", reject: "Reprovou", correction: "Solicitou correção", submit: "Enviou para análise", resubmit: "Reenviou após correção", suspend: "Suspendeu",
    block: "Bloqueou", resume: "Reativou", approveVideo: "Aprovou vídeo", rejectVideo: "Reprovou vídeo",
    disableBoost: "Desativou boost", PROFESSIONAL_APPROVED: "Aprovou", PROFESSIONAL_REJECTED: "Reprovou",
    SETTINGS_CHANGED: "Alterou configuração",
  };
  return labels[explicit ?? entry.action] ?? explicit ?? entry.action;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="pro-section"><h3>{title}</h3>{children}</section>;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="pro-row"><span>{label}</span><strong>{value || "Não informado"}</strong></div>;
}

function Tags({ values, empty = "Não informado" }: { values: string[]; empty?: string }) {
  if (!values.length) return <p className="pro-empty">{empty}</p>;
  return <div className="pro-tags">{values.map((value) => <span key={value}>{value}</span>)}</div>;
}

export function AdminProfessionalCard({
  professional: pro,
  approvalIssues,
  profileIssues,
  audits,
  reviewAction,
  billingEnabled,
}: {
  professional: AdminProfessionalRecord;
  approvalIssues: string[];
  profileIssues: string[];
  audits: AuditEntry[];
  reviewAction: (formData: FormData) => Promise<void>;
  billingEnabled: boolean;
}) {
  const canApprove = pro.status === "PENDING_REVIEW" && approvalIssues.length === 0;
  const accent = pro.status === "ACTIVE" ? "#16a34a" : pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "#dc2626" : pro.status === "PENDING_REVIEW" || pro.status === "CORRECTION_REQUIRED" ? "#9a25cf" : "#786f7e";
  const tone = pro.status === "ACTIVE" ? "success" : pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "danger" : pro.status === "PENDING_REVIEW" || pro.status === "CORRECTION_REQUIRED" ? "warning" : "neutral";
  const cover = pro.photos.find((photo) => photo.cover)?.url ?? pro.image ?? pro.photos[0]?.url ?? null;
  const calculatedAge = age(pro.birthDate ?? pro.user.birthDate);
  const lastAudit = audits[0];
  const approvedAudit = audits.find((entry) => entry.action === "PROFESSIONAL_APPROVED");
  const kycDivergence = new Set([pro.kycStatus, pro.docStatus, pro.verifStatus].map((item) => item.toUpperCase())).size > 1;
  const serviceAreas = [...new Set([pro.approximateLocation, pro.region, ...pro.serviceCities].filter((item): item is string => Boolean(item)))];
  const prices = [
    ["15 min", pro.price15min], ["30 min", pro.price30min], ["1 hora", pro.pricePerHour],
    ["2 horas", pro.price2h], ["Pernoite", pro.priceOvernight], ["Webcam", pro.priceWebcam],
  ].filter(([, value]) => value != null) as Array<[string, number]>;
  const submissionAudit = audits.find((entry) => ["Enviou para análise", "Reenviou após correção"].includes(moderationAction(entry)));
  const submittedAt = submissionAudit?.timestamp ?? pro.submissionReceipt?.createdAt ?? null;
  const completion = professionalCompletion({ ...pro, emailVerified: true });
  const communicationAudits = audits.filter((entry) => {
    const value = JSON.stringify(entry.changes ?? {});
    return value.includes("EMAIL_SENT") || value.includes("EMAIL_FAILED");
  });
  const currentIssues = pro.status === "PENDING_REVIEW" ? approvalIssues : profileIssues;
  const billing = resolveProfessionalAccess(pro, pro.user, pro.status === "ACTIVE" || pro.status === "PAUSED", new Date(), { billingEnabled });
  const billingLabel = {
    PENDING_APPROVAL: "Aguardando aprovação",
    TRIAL: "Trial ativo",
    ACTIVE: "Assinatura ativa",
    TRIAL_EXPIRED: "Trial encerrado",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    GRANDFATHERED: "Conta legada",
  }[billing.kind];
  const lifecycle = [
    ["Cadastro iniciado", true], ["Cadastro concluído", profileIssues.length === 0],
    ["Enviado para análise", pro.status !== "DRAFT" || Boolean(pro.submissionReceipt)],
    ["Aguardando aprovação", pro.status === "PENDING_REVIEW"], ["Aprovado", pro.status === "ACTIVE"],
    ["Reprovado", pro.status === "REJECTED"],
    ["Correção solicitada", pro.status === "CORRECTION_REQUIRED" || audits.some((a) => moderationAction(a) === "Solicitou correção")],
    ["Pausado", pro.status === "PAUSED"], ["Suspenso", pro.status === "SUSPENDED"], ["Bloqueado", pro.user.blocked],
  ] as Array<[string, boolean]>;

  return (
    <article className="pro-card" style={{ borderLeftColor: accent }}>
      <header className="pro-card-head">
        <div className="pro-identity">
          {cover ? <img src={cover} alt="" loading="lazy" /> : <span style={{ color: accent }}>{(pro.displayName || "?")[0].toUpperCase()}</span>}
          <div>
            <Link href={`/profissionais/${pro.slug}`}>{pro.displayName || "(sem nome)"}</Link>
            <p>{[pro.city, pro.state].filter(Boolean).join("/") || "Local não informado"} · {pro.escortCategory ?? "categoria não informada"}</p>
          </div>
        </div>
        <div className="pro-head-status">
          <StatusPill tone={tone}>{STATUS_LABEL[pro.status] ?? pro.status}</StatusPill>
          <span className={`pro-kyc ${pro.kycStatus === "APPROVED" ? "ok" : pro.kycStatus === "REJECTED" ? "bad" : "pending"}`}>
            KYC: {providerLabel(pro.kycProvider, pro.kycSessionId)} · {technicalStatus(pro.kycStatus)}
          </span>
          <small>Cadastro: {date(pro.createdAt)}</small>
        </div>
      </header>

      <details className="admin-professional-details">
        <summary>Ver cadastro completo</summary>
        <div className="pro-detail-layout">
          <div className="pro-sections">
            <Section title="DADOS PESSOAIS / CONTATO">
              <Row label="Nome de exibição" value={pro.displayName} />
              <Row label="Nome cadastrado" value={pro.user.name} />
              <Row label="Nascimento" value={`${date(pro.birthDate ?? pro.user.birthDate)}${calculatedAge != null ? ` · ${calculatedAge} anos` : ""}`} />
              <Row label="Sexo/gênero" value={pro.escortCategory ?? pro.user.category} />
              <Row label="Altura" value={pro.height ? `${pro.height} cm` : null} />
              <Row label="Telefone" value={pro.phone ?? pro.user.phone} />
              <Row label="WhatsApp" value={pro.whatsapp} />
              <Row label="E-mail" value={pro.user.email} />
              <Row label="Conta criada" value={date(pro.user.createdAt, true)} />
              <Row label="Enviado para análise" value={submittedAt ? date(submittedAt, true) : pro.status === "DRAFT" ? "Ainda não enviado" : "Data não registrada (cadastro legado)"} />
              <Row label="Última atualização" value={date(pro.updatedAt, true)} />
            </Section>

            <Section title={`CADASTRO · ${completion.profilePercent}% CONCLUÍDO`}>
              <div className="pro-completion"><i style={{ width: completion.profilePercent + "%" }} /></div>
              <Row label="Dados obrigatórios" value={completion.profileComplete ? "Completos" : completion.profileIssues.length + " pendência(s)"} />
              <Row label="KYC separado" value={completion.kycApproved ? "Aprovado" : "Pendente"} />
              <Row label="Pronto para enviar" value={completion.readyToSubmit ? "Sim" : "Não"} />
              <Row label="Regra" value={pro.completionRulesVersion >= 2 ? "Atual" : "Compatibilidade de legado"} />
            </Section>

            <Section title="LOCALIZAÇÃO / ATUAÇÃO">
              <p className="pro-subtitle">Dados da conta</p>
              <Row label="Cidade/UF da conta" value={[pro.user.city, pro.user.state].filter(Boolean).join("/")} />
              <p className="pro-subtitle">Endereço do perfil (sem classificação no banco)</p>
              <Row label="Endereço cadastrado" value={pro.address} />
              <Row label="Bairro cadastrado" value={pro.bairro} />
              <p className="pro-subtitle">Área de atuação</p>
              <Row label="Cidade principal" value={[pro.city, pro.state].filter(Boolean).join("/")} />
              <Row label="Região onde atende" value={pro.approximateLocation ?? pro.region} />
              <Row label="Outras cidades" value={pro.serviceCities.length ? pro.serviceCities.join(", ") : "Não informado"} />
              <Row label="Localização da plataforma" value={pro.placeId ? `${pro.city}/${pro.state} · local selecionado` : `${pro.city}/${pro.state}`} />
              <Row label="Coordenadas" value={pro.latitude != null && pro.longitude != null ? `${pro.latitude.toFixed(5)}, ${pro.longitude.toFixed(5)}` : null} />
              <p className="pro-subtitle">Formas e locais de atendimento</p>
              <Tags values={pro.attendanceTypes} />
              {serviceAreas.length > 0 && <><p className="pro-subtitle">Áreas registradas</p><Tags values={serviceAreas} /></>}
            </Section>

            <Section title="PERFIL">
              <div className="pro-metrics">
                <b>{pro.photos.length}<span>fotos</span></b><b>{pro.presentationVideoUrl ? 1 : 0}<span>vídeos</span></b>
                <b>{pro.services.length}<span>serviços</span></b><b>{pro.specialties.length}<span>especialidades</span></b>
              </div>
              {cover && <div className="pro-cover"><img src={cover} alt={`Foto principal de ${pro.displayName}`} loading="lazy" /><span>Foto principal</span></div>}
              <p className="pro-subtitle">Galeria administrativa · {pro.photos.length} foto(s)</p>
              {pro.photos.length ? <div className="pro-gallery">{pro.photos.map((photo) => <a href={photo.url} target="_blank" rel="noreferrer" key={photo.id} className={photo.cover ? "cover" : ""}><img src={photo.url} alt={photo.caption ?? `Foto de ${pro.displayName}`} loading="lazy" /><span>{photo.cover ? "Principal · ampliar" : "Ampliar"}</span></a>)}</div> : <p className="pro-empty">Nenhuma foto enviada</p>}
              {pro.presentationVideoUrl && <div className="pro-admin-video"><video src={pro.presentationVideoUrl} controls preload="metadata" /><span>Vídeo de apresentação · {technicalStatus(pro.presentationVideoStatus)}</span></div>}
              <p className="pro-subtitle">Serviços</p><Tags values={pro.services} empty="Nenhum serviço cadastrado" />
              <p className="pro-subtitle">Especialidades</p><Tags values={pro.specialties.map((item) => item.name)} empty="Nenhuma especialidade cadastrada" />
              <p className="pro-subtitle">Bio/descrição</p><p className="pro-bio">{pro.bio || "Não informada"}</p>
              <p className="pro-subtitle">Valores</p>
              {prices.length ? <div className="pro-price-list">{prices.map(([label, value]) => <Row key={label} label={label} value={money(value)} />)}</div> : <p className="pro-empty">Nenhum valor cadastrado</p>}
              <Row label="Faixa geral" value={pro.priceMin != null || pro.priceMax != null ? `${money(pro.priceMin) ?? "—"} a ${money(pro.priceMax) ?? "—"}` : null} />
              <p className="pro-subtitle">Disponibilidade</p><Tags values={pro.diasDisponiveis} />
              <Row label="Horário" value={pro.horarioInicio || pro.horarioFim ? `${pro.horarioInicio ?? "—"} às ${pro.horarioFim ?? "—"}` : null} />
              <Row label="Público atendido" value={pro.servesGenders.join(", ")} />
              <Row label="Idiomas" value={pro.idiomas.join(", ")} />
              <Row label="Perfil" value={profileIssues.length ? "Incompleto" : "Completo"} />
            </Section>

            <Section title="TRIAL / ASSINATURA">
              <Row label="Status" value={billingLabel} />
              <Row label="Início do trial" value={date(pro.freeAccessStartedAt, true)} />
              <Row label="Fim do trial" value={date(pro.freeAccessEndsAt, true)} />
              <Row label="Dias restantes" value={billing.freeTrialDaysLeft == null ? "Não se aplica" : billing.freeTrialDaysLeft} />
              <Row label="Assinatura ativa" value={billing.subscriptionActive ? "Sim" : "Não"} />
              <Row label="Conta anterior à política" value={pro.accessGrandfathered ? "Sim" : "Não"} />
              <Row label="Cobrança global" value={billingEnabled ? "Habilitada" : "Desabilitada"} />
            </Section>

            <Section title="KYC / IDENTIDADE">
              <Row label="Método" value={providerLabel(pro.kycProvider, pro.kycSessionId)} />
              <Row label="Status geral" value={technicalStatus(pro.kycStatus)} />
              <Row label="Documento" value={technicalStatus(pro.docStatus)} />
              <Row label="Facial/selfie" value={technicalStatus(pro.verifStatus)} />
              <Row label="Enviado em" value={date(pro.user.kycSubmittedAt, true)} />
              <Row label="Verificado em" value={date(pro.user.kycReviewedAt, true)} />
              <Row label="ID da sessão" value={pro.kycSessionId ? <code>{pro.kycSessionId}</code> : null} />
              <Row label="Prova adicional" value={pro.verificationUrl ? (pro.verificationType ?? "Arquivo") : null} />
              <Row label="Vídeo de apresentação" value={pro.presentationVideoUrl ? technicalStatus(pro.presentationVideoStatus) : "Não enviado"} />
              <AdminKycEvidence
                professionalId={pro.id}
                provider={pro.kycProvider}
                sessionId={pro.kycSessionId}
                evidence={[
                  ...(pro.docFrenteUrl ? [{ label: "documento — frente", path: pro.docFrenteUrl }] : []),
                  ...(pro.docVersoUrl ? [{ label: "documento — verso", path: pro.docVersoUrl }] : []),
                  ...(pro.verificationUrl && !pro.verificationUrl.includes("didit.me") ? [{ label: "selfie/prova de vida", path: pro.verificationUrl }] : []),
                ]}
              />
              {(kycDivergence || pro.user.kycRejectionReason || pro.presentationVideoRejectReason) && (
                <div className="pro-alert bad"><b>Divergência identificada</b><span>{pro.user.kycRejectionReason ?? pro.presentationVideoRejectReason ?? "Os estados geral, documental e facial não coincidem."}</span></div>
              )}
            </Section>

            <Section title="STATUS / PENDÊNCIAS">
              <div className="pro-lifecycle">{lifecycle.map(([label, active]) => <span className={active ? "active" : ""} key={label}>{active ? "✓" : "○"} {label}</span>)}</div>
              {currentIssues.length ? (
                <><p className="pro-subtitle danger">{pro.status === "PENDING_REVIEW" ? "Pendências para aprovação" : "Campos faltantes"} ({currentIssues.length})</p><div className="pro-issues">{currentIssues.map((issue) => <span key={issue}>{issue}</span>)}</div></>
              ) : <div className="pro-alert ok">✓ Cadastro completo conforme as regras atuais</div>}
              {pro.rejectReason && <div className="pro-alert bad"><b>Motivo atual</b><span>{pro.rejectReason}</span></div>}
              {pro.pauseReason && <div className="pro-alert warn"><b>Motivo da pausa</b><span>{pro.pauseReason}</span></div>}
              {pro.user.blockReason && <div className="pro-alert bad"><b>Motivo do bloqueio</b><span>{pro.user.blockReason}</span></div>}
            </Section>

            <Section title="ADMINISTRAÇÃO / HISTÓRICO">
              <Row label="Última ação" value={lastAudit ? moderationAction(lastAudit) : null} />
              <Row label="Moderado por" value={lastAudit?.admin?.name ?? lastAudit?.admin?.email ?? lastAudit?.actorIdentifier} />
              <Row label="Data da última ação" value={date(lastAudit?.timestamp, true)} />
              <Row label="Aprovado por" value={approvedAudit?.admin?.name ?? approvedAudit?.admin?.email ?? approvedAudit?.actorIdentifier} />
              <Row label="Data da aprovação" value={date(approvedAudit?.timestamp, true)} />
              {lastAudit?.reason && <div className="pro-alert neutral"><b>Motivo da última moderação</b><span>{lastAudit.reason}</span></div>}
              <p className="pro-subtitle">Histórico de localização</p>
              {pro.locationChanges.length ? <ol className="pro-history">{pro.locationChanges.map((change) => <li key={change.id}><b>{change.changeType} · {change.verificationStatus}</b><span>{change.fromCity ?? "Não registrado"}/{change.fromState ?? "—"} → {change.toCity}/{change.toState} · {date(change.createdAt, true)}</span>{change.riskReason && <small>{change.riskReason}</small>}</li>)}</ol> : <p className="pro-empty">Nenhuma mudança de localização registrada</p>}
              <p className="pro-subtitle">Comunicações</p>
              {communicationAudits.length ? <ol className="pro-history">{communicationAudits.map((entry) => <li key={entry.id}><b>{JSON.stringify(entry.changes).includes("EMAIL_FAILED") ? "EMAIL_FAILED" : "EMAIL_SENT"}</b><span>{date(entry.timestamp, true)}</span><small>{entry.reason}</small></li>)}</ol> : <p className="pro-empty">Nenhuma comunicação registrada</p>}
              <p className="pro-subtitle">Alterações recentes</p>
              {audits.length ? <ol className="pro-history">{audits.map((entry) => <li key={entry.id}><b>{moderationAction(entry)}</b><span>{entry.admin?.name ?? entry.admin?.email ?? entry.actorIdentifier ?? "Sistema"} · {date(entry.timestamp, true)}</span>{entry.reason && <small>{entry.reason}</small>}</li>)}</ol> : <p className="pro-empty">Nenhuma ação administrativa registrada</p>}
            </Section>
          </div>

          <aside className="pro-actions">
            <h3>AÇÕES</h3>
            {currentIssues.length > 0 && <form action={reviewAction} className="pro-reminder-form">
              <input type="hidden" name="id" value={pro.id} /><input type="hidden" name="action" value="reminder" />
              <label><input type="checkbox" name="confirmReminder" value="yes" required /> Confirmo o envio de um lembrete com as pendências atuais.</label>
              <button type="submit">Enviar lembrete</button>
            </form>}
            <form action={reviewAction}>
              <input type="hidden" name="id" value={pro.id} />
              <button name="action" value="approve" disabled={!canApprove} title={!canApprove ? approvalIssues.join(", ") || "Este status não permite aprovação" : "Aprovar profissional"} className="pro-approve">
                {canApprove ? "✓ Aprovar agora" : pro.status === "ACTIVE" ? "✓ Já aprovada" : "Aprovar (bloqueado)"}
              </button>
              <fieldset className="pro-correction-fields"><legend>Ao solicitar correção, marque os itens</legend>{[
                ["mainPhoto","Foto principal"],["bio","Biografia"],["services","Serviços"],["location","Localização"],
                ["prices","Valores"],["kyc","Documento/KYC"],["contact","Contato"],["availability","Disponibilidade"],["other","Outro"],
              ].map(([value,label]) => <label key={value}><input type="checkbox" name="correctionFields" value={value} /> {label}</label>)}</fieldset>
              <textarea name="reason" placeholder="Observação da moderação (obrigatória para reprovar, suspender ou bloquear; opcional ao solicitar correção)" />
                            <div className="pro-action-grid">
                {pro.locationVerificationStatus === "LOCATION_REVIEW_REQUIRED" && <>
                  <button name="action" value="approveLocation" className="full">Aprovar localização</button>
                  <button name="action" value="rejectLocation" className="danger-button full">Rejeitar localização</button>
                </>}
                {pro.status === "PAUSED" && <button name="action" value="resume" style={buttonStyle}>Reativar</button>}
                <button name="action" value="reject" className="danger-button">Reprovar</button>
                <button name="action" value="correction" className="warn-button">Corrigir</button>
                <button name="action" value="suspend" className="warn-button">Suspender</button>
                <button name="action" value="block" className="danger-button">Bloquear</button>
                {pro.presentationVideoUrl && <><button name="action" value="approveVideo">✓ Vídeo</button><button name="action" value="rejectVideo" className="danger-button">✗ Vídeo</button></>}
                {pro.boostActive && <button name="action" value="disableBoost" className="warn-button full">Desativar boost</button>}
              </div>
            </form>
            <div className="pro-admin-meta">
              <Row label="Views" value={pro.profileViews} /><Row label="Contatos" value={pro.contactClicks} />
              <Row label="Avaliação" value={`${pro.rating.toFixed(1)} (${pro.totalReviews})`} />
              <Row label="Boost" value={pro.boostActive ? `Ativo${pro.boostUntil ? ` até ${date(pro.boostUntil)}` : ""}` : "Inativo"} />
              <Row label="Acesso" value={billingLabel} />
            </div>
          </aside>
        </div>
      </details>
    </article>
  );
}
