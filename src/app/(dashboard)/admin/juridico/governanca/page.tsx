import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { canEnableLivePayout } from "@/lib/booking-policy";
import { prisma } from "@/lib/prisma";
import {
  AdminHeader,
  AdminPanel,
  AdminTable,
  StatusPill,
  buttonStyle,
  tdStyle,
  thStyle,
} from "../../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const PROPOSAL_LABEL = "PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA";

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function optionalText(formData: FormData, name: string) {
  const value = String(formData.get(name) || "").trim();
  return value || null;
}

async function updateBookingProposal(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const reason = String(formData.get("reason") || "").trim();
  const percentage = Number(formData.get("serviceFeePercentage"));
  const bookingPayoutDelayHours = Number(formData.get("bookingPayoutDelayHours"));
  const contestationRaw = String(formData.get("bookingContestationHours") || "").trim();
  const bookingContestationHours = contestationRaw ? Number(contestationRaw) : null;
  const bookingPayoutReleaseEvent = String(formData.get("bookingPayoutReleaseEvent") || "");
  const commonReportTriageBusinessDays = Number(formData.get("commonReportTriageBusinessDays"));
  const supportInitialResponseBusinessDays = Number(formData.get("supportInitialResponseBusinessDays"));
  const refundReviewBusinessDays = Number(formData.get("refundReviewBusinessDays"));
  if (reason.length < 8 || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) return;
  if (!Number.isInteger(bookingPayoutDelayHours) || bookingPayoutDelayHours < 0 || bookingPayoutDelayHours > 8760) return;
  if (bookingContestationHours !== null && (!Number.isInteger(bookingContestationHours) || bookingContestationHours < 1 || bookingContestationHours > 8760)) return;
  if (!["CHECK_IN_CONFIRMED", "CHECK_OUT_CONFIRMED", "MANUAL_APPROVAL"].includes(bookingPayoutReleaseEvent)) return;
  if (![commonReportTriageBusinessDays, supportInitialResponseBusinessDays, refundReviewBusinessDays].every((value) => Number.isInteger(value) && value >= 1 && value <= 365)) return;

  const gates = {
    bookingCommercialModelApproved: checked(formData, "bookingCommercialModelApproved"),
    bookingCancellationPolicyApproved: checked(formData, "bookingCancellationPolicyApproved"),
    bookingPayoutIntegrationHomologated: checked(formData, "bookingPayoutIntegrationHomologated"),
    bookingFinancialTestsApproved: checked(formData, "bookingFinancialTestsApproved"),
  };
  const requestedLivePayout = checked(formData, "bookingLivePayoutEnabled");
  if (requestedLivePayout && !canEnableLivePayout(gates)) return;

  const previous = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  const next = {
    bookingServiceFeeBps: Math.round(percentage * 100),
    bookingPayoutDelayHours,
    bookingPayoutReleaseEvent,
    bookingContestationHours,
    bookingProposalStatus: "PENDING_PARTNER_AND_LEGAL_APPROVAL",
    bookingLivePayoutEnabled: requestedLivePayout,
    commonReportTriageBusinessDays,
    supportInitialResponseBusinessDays,
    refundReviewBusinessDays,
    ...gates,
  };
  await prisma.$transaction([
    prisma.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...next },
      update: next,
    }),
    prisma.bookingPolicyHistory.create({
      data: {
        actorId: session.user.id,
        action: "BOOKING_PROPOSAL_UPDATED",
        reason,
        before: previous ? JSON.parse(JSON.stringify(previous)) : undefined,
        after: next,
      },
    }),
  ]);
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "booking-policy-proposal",
    reason,
    changes: next,
  });
  revalidatePath("/admin/juridico/governanca");
  revalidatePath("/admin/reservas");
}

async function updateAuthorityRule(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const id = String(formData.get("id") || "");
  const operationalRule = String(formData.get("operationalRule") || "").trim();
  const requiredPermission = String(formData.get("requiredPermission") || "").trim();
  const status = String(formData.get("status") || "PROPOSED");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || operationalRule.length < 8 || requiredPermission.length < 3 || reason.length < 8) return;
  if (!["PROPOSED", "IN_REVIEW", "APPROVED"].includes(status)) return;
  const changes = {
    operationalRule,
    requiredPermission,
    status,
    canExecuteAlone: checked(formData, "canExecuteAlone"),
    requiresSecondApprover: checked(formData, "requiresSecondApprover"),
    requiresPartner: checked(formData, "requiresPartner"),
    requiresLegal: checked(formData, "requiresLegal"),
    requiresEvidence: checked(formData, "requiresEvidence"),
    requiresUserNotification: checked(formData, "requiresUserNotification"),
  };
  await prisma.moderationAuthorityRule.update({ where: { id }, data: changes });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason,
    changes,
  });
  revalidatePath("/admin/juridico/governanca");
}

async function updateCorporateChannel(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  const email = optionalText(formData, "email");
  const status = String(formData.get("status") || "PENDING_CREATION");
  if (!id || reason.length < 8 || !["PENDING_CREATION", "IN_VALIDATION", "ACTIVE"].includes(status)) return;
  const changes = {
    email,
    owner: optionalText(formData, "owner"),
    recoveryEmail: optionalText(formData, "recoveryEmail"),
    status,
    domainValidated: checked(formData, "domainValidated"),
    receiveValidated: checked(formData, "receiveValidated"),
    sendValidated: checked(formData, "sendValidated"),
    mfaEnabled: checked(formData, "mfaEnabled"),
    lastValidatedAt: status === "ACTIVE" ? new Date() : null,
  };
  if (status === "ACTIVE" && (!email || !changes.owner || !changes.domainValidated || !changes.receiveValidated || !changes.sendValidated || !changes.mfaEnabled)) return;
  await prisma.corporateChannel.update({ where: { id }, data: changes });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason,
    changes: { ...changes, emailConfigured: Boolean(email), recoveryConfigured: Boolean(changes.recoveryEmail) },
  });
  revalidatePath("/admin/juridico/governanca");
}

async function updatePrivacyAppointment(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const reason = String(formData.get("reason") || "").trim();
  const status = String(formData.get("status") || "NOT_FORMALLY_APPOINTED");
  if (reason.length < 8 || !["NOT_FORMALLY_APPOINTED", "IN_REVIEW", "FORMALLY_APPOINTED"].includes(status)) return;
  const changes = {
    operationalOwner: "BRUNO MORAES DA ROCHA",
    formalName: optionalText(formData, "formalName"),
    formalRole: optionalText(formData, "formalRole"),
    publicEmail: optionalText(formData, "publicEmail"),
    corporatePhone: optionalText(formData, "corporatePhone"),
    designationActReference: optionalText(formData, "designationActReference"),
    substituteName: optionalText(formData, "substituteName"),
    duties: optionalText(formData, "duties"),
    autonomy: optionalText(formData, "autonomy"),
    conflicts: optionalText(formData, "conflicts"),
    legalRepresentativeApproval: optionalText(formData, "legalRepresentativeApproval"),
    status,
  };
  if (status === "FORMALLY_APPOINTED" && [
    changes.formalName,
    changes.formalRole,
    changes.publicEmail,
    changes.corporatePhone,
    changes.designationActReference,
    changes.substituteName,
    changes.duties,
    changes.autonomy,
    changes.conflicts,
    changes.legalRepresentativeApproval,
  ].some((value) => !value)) return;
  await prisma.privacyOfficerAppointment.upsert({
    where: { id: "default" },
    create: { id: "default", ...changes },
    update: changes,
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "privacy-officer-appointment",
    reason,
    changes: { ...changes, cpfStored: false },
  });
  revalidatePath("/admin/juridico/governanca");
}

async function updateAddressVisibility(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  const legalReviewStatus = String(formData.get("legalReviewStatus") || "PENDING_LEGAL_REVIEW");
  const legallyRequired = checked(formData, "legallyRequired");
  const requestedVisible = checked(formData, "visible");
  if (!id || reason.length < 8 || !["PENDING_LEGAL_REVIEW", "APPROVED", "REJECTED"].includes(legalReviewStatus)) return;
  const changes = {
    visible: legallyRequired ? true : requestedVisible,
    legallyRequired,
    legalReviewStatus,
    notes: optionalText(formData, "notes"),
  };
  await prisma.legalAddressVisibility.update({ where: { id }, data: changes });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason,
    changes,
  });
  revalidatePath("/admin/juridico/governanca");
}

function tone(status: string) {
  if (["ACTIVE", "APPROVED", "FORMALLY_APPOINTED"].includes(status)) return "success" as const;
  if (["REJECTED", "BLOCKED"].includes(status)) return "danger" as const;
  return "warning" as const;
}

export default async function OperationalGovernancePage() {
  await requireAdmin("settings:manage");
  const [settings, authorityRules, channels, appointment, addressRules, history] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
    prisma.moderationAuthorityRule.findMany({ orderBy: { action: "asc" } }),
    prisma.corporateChannel.findMany({ orderBy: [{ required: "desc" }, { label: "asc" }] }),
    prisma.privacyOfficerAppointment.findUnique({ where: { id: "default" } }),
    prisma.legalAddressVisibility.findMany({ orderBy: { label: "asc" } }),
    prisma.bookingPolicyHistory.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const current = settings ?? {
    bookingServiceFeeBps: 1000,
    bookingPayoutDelayHours: 24,
    bookingPayoutReleaseEvent: "CHECK_IN_CONFIRMED",
    bookingContestationHours: null,
    bookingCommercialModelApproved: false,
    bookingCancellationPolicyApproved: false,
    bookingPayoutIntegrationHomologated: false,
    bookingFinancialTestsApproved: false,
    bookingLivePayoutEnabled: false,
    commonReportTriageBusinessDays: 2,
    supportInitialResponseBusinessDays: 2,
    refundReviewBusinessDays: 5,
  };

  return (
    <div>
      <AdminHeader
        title="Governanca operacional"
        subtitle="Moderacao, privacidade, canais, endereco e proposta financeira com auditoria."
        action={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/juridico/governanca/minutas" style={buttonStyle}>Minutas internas</Link>
            <Link href="/admin/juridico" style={buttonStyle}>Voltar ao juridico</Link>
          </div>
        )}
      />
      <AdminPanel>
        <StatusPill tone="warning">{PROPOSAL_LABEL}</StatusPill>
        <p style={muted}>
          Responsavel operacional pela moderacao e pelas solicitacoes de privacidade: <strong style={{ color: "#fff" }}>BRUNO MORAES DA ROCHA</strong>.
          A indicacao formal continua pendente ate o preenchimento e aprovacao de todos os campos abaixo.
        </p>
      </AdminPanel>

      <SectionGap />
      <AdminPanel>
        <h2 style={heading}>Proposta financeira das reservas</h2>
        <form action={updateBookingProposal} style={formGrid}>
          <div style={responsiveGrid}>
            <Field label="Taxa da plataforma (%)"><input name="serviceFeePercentage" type="number" min="0" max="100" step="0.01" defaultValue={current.bookingServiceFeeBps / 100} required style={inputStyle} /></Field>
            <Field label="Prazo de repasse (horas)"><input name="bookingPayoutDelayHours" type="number" min="0" max="8760" defaultValue={current.bookingPayoutDelayHours} required style={inputStyle} /></Field>
            <Field label="Evento de liberacao">
              <select name="bookingPayoutReleaseEvent" defaultValue={current.bookingPayoutReleaseEvent} style={inputStyle}>
                <option value="CHECK_IN_CONFIRMED">Check-in confirmado</option>
                <option value="CHECK_OUT_CONFIRMED">Check-out confirmado</option>
                <option value="MANUAL_APPROVAL">Aprovacao manual</option>
              </select>
            </Field>
            <Field label="Prazo de contestacao (horas)"><input name="bookingContestationHours" type="number" min="1" max="8760" defaultValue={current.bookingContestationHours ?? ""} style={inputStyle} /></Field>
            <Field label="Triagem de denuncia comum (dias uteis)"><input name="commonReportTriageBusinessDays" type="number" min="1" max="365" defaultValue={current.commonReportTriageBusinessDays} required style={inputStyle} /></Field>
            <Field label="Resposta inicial de suporte (dias uteis)"><input name="supportInitialResponseBusinessDays" type="number" min="1" max="365" defaultValue={current.supportInitialResponseBusinessDays} required style={inputStyle} /></Field>
            <Field label="Analise de reembolso (dias uteis)"><input name="refundReviewBusinessDays" type="number" min="1" max="365" defaultValue={current.refundReviewBusinessDays} required style={inputStyle} /></Field>
          </div>
          <div style={checkGrid}>
            <Check name="bookingCommercialModelApproved" label="Modelo comercial aprovado" defaultChecked={current.bookingCommercialModelApproved} />
            <Check name="bookingCancellationPolicyApproved" label="Politica de cancelamento aprovada" defaultChecked={current.bookingCancellationPolicyApproved} />
            <Check name="bookingPayoutIntegrationHomologated" label="Integracao de repasse homologada" defaultChecked={current.bookingPayoutIntegrationHomologated} />
            <Check name="bookingFinancialTestsApproved" label="Testes financeiros concluidos" defaultChecked={current.bookingFinancialTestsApproved} />
            <Check name="bookingLivePayoutEnabled" label="Chave mestre de repasse live" defaultChecked={current.bookingLivePayoutEnabled} />
          </div>
          <p style={muted}>A chave live so pode ser salva quando as quatro validacoes anteriores estiverem registradas. Nenhuma cobranca ou repasse e ativado automaticamente.</p>
          <input name="reason" required minLength={8} placeholder="Justificativa da alteracao" style={inputStyle} />
          <button style={primaryButton}>Salvar proposta e auditar</button>
        </form>
        {history.length ? (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ ...heading, fontSize: 14 }}>Historico recente</h3>
            {history.map((entry) => <p key={entry.id} style={muted}><strong style={{ color: "#fff" }}>{entry.action}</strong> - {entry.createdAt.toLocaleString("pt-BR")} - {entry.reason}</p>)}
          </div>
        ) : null}
      </AdminPanel>

      <SectionGap />
      <AdminPanel>
        <h2 style={heading}>Matriz de autoridade da moderacao</h2>
        <AdminTable>
          <thead><tr><th style={thStyle}>Acao</th><th style={thStyle}>Regra e permissao</th><th style={thStyle}>Autoridade</th><th style={thStyle}>Salvar</th></tr></thead>
          <tbody>
            {authorityRules.map((rule) => (
              <tr key={rule.id}>
                <td style={tdStyle}><strong>{rule.action}</strong><br /><StatusPill tone={tone(rule.status)}>{rule.status}</StatusPill></td>
                <td style={{ ...tdStyle, minWidth: 300 }}>
                  <form action={updateAuthorityRule} style={formGrid}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input name="requiredPermission" defaultValue={rule.requiredPermission} required style={inputStyle} />
                    <textarea name="operationalRule" defaultValue={rule.operationalRule} required rows={4} style={inputStyle} />
                    <select name="status" defaultValue={rule.status} style={inputStyle}>
                      <option value="PROPOSED">Proposta</option>
                      <option value="IN_REVIEW">Em revisao</option>
                      <option value="APPROVED">Aprovada</option>
                    </select>
                    <input name="reason" required minLength={8} placeholder="Justificativa" style={inputStyle} />
                    <button style={buttonStyle}>Salvar e auditar</button>
                    <div style={{ display: "none" }}>
                      <input name="canExecuteAlone" type="checkbox" defaultChecked={rule.canExecuteAlone} />
                      <input name="requiresSecondApprover" type="checkbox" defaultChecked={rule.requiresSecondApprover} />
                      <input name="requiresPartner" type="checkbox" defaultChecked={rule.requiresPartner} />
                      <input name="requiresLegal" type="checkbox" defaultChecked={rule.requiresLegal} />
                      <input name="requiresEvidence" type="checkbox" defaultChecked={rule.requiresEvidence} />
                      <input name="requiresUserNotification" type="checkbox" defaultChecked={rule.requiresUserNotification} />
                    </div>
                  </form>
                </td>
                <td style={{ ...tdStyle, minWidth: 250 }}>
                  <form action={updateAuthorityRule} style={checkGrid}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="requiredPermission" value={rule.requiredPermission} />
                    <input type="hidden" name="operationalRule" value={rule.operationalRule} />
                    <input type="hidden" name="status" value={rule.status} />
                    <Check name="canExecuteAlone" label="Pode executar sozinho" defaultChecked={rule.canExecuteAlone} />
                    <Check name="requiresSecondApprover" label="Exige segundo aprovador" defaultChecked={rule.requiresSecondApprover} />
                    <Check name="requiresPartner" label="Exige socio" defaultChecked={rule.requiresPartner} />
                    <Check name="requiresLegal" label="Exige juridico" defaultChecked={rule.requiresLegal} />
                    <Check name="requiresEvidence" label="Preservar evidencia" defaultChecked={rule.requiresEvidence} />
                    <Check name="requiresUserNotification" label="Comunicar usuario" defaultChecked={rule.requiresUserNotification} />
                    <input name="reason" required minLength={8} placeholder="Justificativa" style={inputStyle} />
                    <button style={buttonStyle}>Atualizar autoridade</button>
                  </form>
                </td>
                <td style={tdStyle}>Todas as alteracoes geram AuditLog.</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <SectionGap />
      <AdminPanel>
        <h2 style={heading}>Indicacao de privacidade</h2>
        <form action={updatePrivacyAppointment} style={formGrid}>
          <div style={responsiveGrid}>
            <Field label="Responsavel operacional"><input value="BRUNO MORAES DA ROCHA" readOnly style={inputStyle} /></Field>
            <Field label="Nome formal"><input name="formalName" defaultValue={appointment?.formalName ?? ""} style={inputStyle} /></Field>
            <Field label="Cargo formal"><input name="formalRole" defaultValue={appointment?.formalRole ?? ""} style={inputStyle} /></Field>
            <Field label="E-mail publico"><input name="publicEmail" type="email" defaultValue={appointment?.publicEmail ?? ""} style={inputStyle} /></Field>
            <Field label="Telefone corporativo"><input name="corporatePhone" defaultValue={appointment?.corporatePhone ?? ""} style={inputStyle} /></Field>
            <Field label="Ato de indicacao"><input name="designationActReference" defaultValue={appointment?.designationActReference ?? ""} style={inputStyle} /></Field>
            <Field label="Substituto"><input name="substituteName" defaultValue={appointment?.substituteName ?? ""} style={inputStyle} /></Field>
            <Field label="Aprovacao do representante legal"><input name="legalRepresentativeApproval" defaultValue={appointment?.legalRepresentativeApproval ?? ""} style={inputStyle} /></Field>
          </div>
          <Field label="Funcoes"><textarea name="duties" defaultValue={appointment?.duties ?? ""} rows={3} style={inputStyle} /></Field>
          <Field label="Autonomia e limites"><textarea name="autonomy" defaultValue={appointment?.autonomy ?? ""} rows={3} style={inputStyle} /></Field>
          <Field label="Conflitos de interesse"><textarea name="conflicts" defaultValue={appointment?.conflicts ?? ""} rows={3} style={inputStyle} /></Field>
          <Field label="Status formal">
            <select name="status" defaultValue={appointment?.status ?? "NOT_FORMALLY_APPOINTED"} style={inputStyle}>
              <option value="NOT_FORMALLY_APPOINTED">Nao formalmente indicado</option>
              <option value="IN_REVIEW">Em revisao</option>
              <option value="FORMALLY_APPOINTED">Formalmente indicado</option>
            </select>
          </Field>
          <p style={muted}>CPF nao e coletado por esta tela. Qualquer tratamento futuro exige necessidade juridica e armazenamento restrito.</p>
          <input name="reason" required minLength={8} placeholder="Justificativa da alteracao" style={inputStyle} />
          <button style={primaryButton}>Salvar indicacao e auditar</button>
        </form>
      </AdminPanel>

      <SectionGap />
      <AdminPanel>
        <h2 style={heading}>Canais corporativos</h2>
        <AdminTable>
          <thead><tr><th style={thStyle}>Canal</th><th style={thStyle}>Configuracao</th><th style={thStyle}>Validacoes</th></tr></thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.id}>
                <td style={tdStyle}><strong>{channel.label}</strong><br /><small>{channel.purpose}</small><br /><StatusPill tone={tone(channel.status)}>{channel.status}</StatusPill></td>
                <td style={{ ...tdStyle, minWidth: 280 }}>
                  <form action={updateCorporateChannel} style={formGrid}>
                    <input type="hidden" name="id" value={channel.id} />
                    <input name="email" type="email" defaultValue={channel.email ?? ""} placeholder="Nao inventar; preencher apos criar" style={inputStyle} />
                    <input name="owner" defaultValue={channel.owner ?? ""} placeholder="Responsavel" style={inputStyle} />
                    <input name="recoveryEmail" type="email" defaultValue={channel.recoveryEmail ?? ""} placeholder="E-mail de recuperacao" style={inputStyle} />
                    <select name="status" defaultValue={channel.status} style={inputStyle}>
                      <option value="PENDING_CREATION">Pendente de criacao</option>
                      <option value="IN_VALIDATION">Em validacao</option>
                      <option value="ACTIVE">Ativo</option>
                    </select>
                    <Check name="domainValidated" label="Dominio validado" defaultChecked={channel.domainValidated} />
                    <Check name="receiveValidated" label="Recebimento validado" defaultChecked={channel.receiveValidated} />
                    <Check name="sendValidated" label="Envio validado" defaultChecked={channel.sendValidated} />
                    <Check name="mfaEnabled" label="MFA habilitado" defaultChecked={channel.mfaEnabled} />
                    <input name="reason" required minLength={8} placeholder="Justificativa" style={inputStyle} />
                    <button style={buttonStyle}>Salvar canal</button>
                  </form>
                </td>
                <td style={tdStyle}>{channel.lastValidatedAt?.toLocaleString("pt-BR") ?? "Ainda nao validado"}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <SectionGap />
      <AdminPanel>
        <h2 style={heading}>Visibilidade do endereco por contexto</h2>
        <AdminTable>
          <thead><tr><th style={thStyle}>Contexto</th><th style={thStyle}>Controle</th><th style={thStyle}>Status</th></tr></thead>
          <tbody>
            {addressRules.map((rule) => (
              <tr key={rule.id}>
                <td style={tdStyle}><strong>{rule.label}</strong></td>
                <td style={{ ...tdStyle, minWidth: 300 }}>
                  <form action={updateAddressVisibility} style={formGrid}>
                    <input type="hidden" name="id" value={rule.id} />
                    <Check name="visible" label="Exibir endereco" defaultChecked={rule.visible} />
                    <Check name="legallyRequired" label="Exibicao legalmente obrigatoria" defaultChecked={rule.legallyRequired} />
                    <select name="legalReviewStatus" defaultValue={rule.legalReviewStatus} style={inputStyle}>
                      <option value="PENDING_LEGAL_REVIEW">Pendente de revisao juridica</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="REJECTED">Rejeitado</option>
                    </select>
                    <textarea name="notes" defaultValue={rule.notes ?? ""} placeholder="Observacoes" rows={2} style={inputStyle} />
                    <input name="reason" required minLength={8} placeholder="Justificativa" style={inputStyle} />
                    <button style={buttonStyle}>Salvar visibilidade</button>
                  </form>
                </td>
                <td style={tdStyle}><StatusPill tone={tone(rule.legalReviewStatus)}>{rule.legalReviewStatus}</StatusPill><br /><small>Informacao obrigatoria nunca pode ser ocultada.</small></td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 7, color: "#fff", fontWeight: 800, fontSize: 13 }}>{label}{children}</label>;
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#e2e8f0", fontSize: 13 }}><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>;
}

function SectionGap() {
  return <div style={{ height: 16 }} />;
}

const heading: React.CSSProperties = { color: "#fff", margin: "0 0 14px", fontSize: 16 };
const muted: React.CSSProperties = { color: "#94a3b8", lineHeight: 1.6, fontSize: 13 };
const formGrid: React.CSSProperties = { display: "grid", gap: 12 };
const responsiveGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 };
const checkGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 9 };
const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 10 };
const primaryButton: React.CSSProperties = { ...buttonStyle, justifySelf: "start", background: "#d4a843", color: "#080704", border: 0 };
