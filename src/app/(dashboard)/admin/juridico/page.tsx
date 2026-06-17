import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import {
  draftChangeSummary,
  draftContent,
  draftPendingFields,
  draftVersion,
  LEGAL_DOCUMENT_DEFINITIONS,
  legalContentHash,
  legalPendingFields,
} from "@/lib/legal-documents";
import {
  canPublishLegalVersion,
  CURRENT_LEGAL_REVIEW_STATUS,
  LEGAL_DOCUMENT_STATUSES,
  OPERATIONAL_LEGAL_STATUS,
  PUBLIC_LEGAL_STATUSES,
} from "@/lib/legal-document-catalog";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function initializeDrafts() {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  for (const [key, name, type, audience, internal] of LEGAL_DOCUMENT_DEFINITIONS) {
    const content = draftContent(key, name, audience);
    const pendingFields = draftPendingFields(key);
    const version = draftVersion(key);
    const internalMinute = key === "privacy-officer-appointment-act";
    const initialStatus = internal ? "DRAFT_INTERNAL" : CURRENT_LEGAL_REVIEW_STATUS;
    const document = await prisma.legalDocument.upsert({
      where: { key },
      create: { key, name, type, audience, internal },
      update: { name, type, audience, internal },
    });
    const activePublicVersion = await prisma.legalDocumentVersion.findFirst({
      where: {
        documentId: document.id,
        language: "pt-BR",
        status: { in: [...PUBLIC_LEGAL_STATUSES] },
      },
      select: { id: true },
    });
    if (activePublicVersion) {
      continue;
    }
    await prisma.legalDocumentVersion.upsert({
      where: { documentId_language_version: { documentId: document.id, language: "pt-BR", version } },
      create: {
        documentId: document.id,
        language: "pt-BR",
        version,
        content,
        contentHash: legalContentHash(content),
        changeSummary: draftChangeSummary(key),
        status: initialStatus,
        pendingFields,
        authorId: session.user.id,
      },
      update: internalMinute
        ? {
            pendingFields,
            content,
            contentHash: legalContentHash(content),
            changeSummary: draftChangeSummary(key),
            status: "DRAFT_INTERNAL",
            approvedAt: null,
            publishedAt: null,
            effectiveAt: null,
            approverId: null,
            legalReviewerName: null,
            legalReviewNote: null,
            legalReviewReference: null,
          }
        : {
            pendingFields,
            content,
            contentHash: legalContentHash(content),
            changeSummary: draftChangeSummary(key),
            status: initialStatus,
          },
    });
  }
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "legal-documents",
    reason: "Rascunhos juridicos iniciais criados ou sincronizados",
  });
  revalidatePath("/admin/juridico");
}

async function requestLegalReview(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const version = await prisma.legalDocumentVersion.findUnique({
    where: { id },
    include: { document: { select: { internal: true, name: true } } },
  });
  if (!version || version.document.internal || version.status !== "READY_FOR_LEGAL_REVIEW") return;

  await prisma.legalDocumentVersion.update({
    where: { id },
    data: {
      status: "LEGAL_REVIEW_REQUESTED",
      legalReviewNote: "Revisao juridica solicitada pela plataforma. Documento ainda nao aprovado.",
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason: `Revisao juridica solicitada para ${version.document.name}`,
  });
  revalidatePath("/admin/juridico");
}

async function publishOperationalVersion(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const version = await prisma.legalDocumentVersion.findUnique({
    where: { id },
    include: { document: { select: { internal: true, name: true } } },
  });
  if (
    !version ||
    version.document.internal ||
    !["READY_FOR_LEGAL_REVIEW", "LEGAL_REVIEW_REQUESTED", OPERATIONAL_LEGAL_STATUS].includes(version.status)
  ) {
    return;
  }

  const now = new Date();
  await prisma.legalDocumentVersion.update({
    where: { id },
    data: {
      status: OPERATIONAL_LEGAL_STATUS,
      publishedAt: now,
      effectiveAt: now,
      approvedAt: null,
      approverId: null,
      legalReviewerName: null,
      legalReviewReference: null,
      legalReviewNote: null,
      operationalPublisherName: "BRUNO MORAES DA ROCHA",
      legalRepresentativeName: "Larissa de Campos Lacerda Souza",
      operationalPublicationNote:
        "Versao operacional da empresa, pendente de ratificacao juridica final.",
      requiresNewAcceptance: true,
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason: `Publicacao operacional registrada para ${version.document.name}; ratificacao juridica pendente`,
  });
  revalidatePath("/admin/juridico");
}

async function publishVersion(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  const id = String(formData.get("id") ?? "");
  const reviewerName = String(formData.get("reviewerName") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  const reviewReference = String(formData.get("reviewReference") ?? "").trim();
  const effectiveAtRaw = String(formData.get("effectiveAt") ?? "").trim();
  if (!id || reviewerName.length < 3 || reviewNote.length < 8 || reviewReference.length < 3) return;
  if (legalPendingFields().length) return;
  const effectiveAt = effectiveAtRaw ? new Date(effectiveAtRaw) : null;
  if (!effectiveAt || Number.isNaN(effectiveAt.getTime())) return;
  const openRequirements = await prisma.publicationRequirement.count({
    where: { requiredForPublish: true, status: { not: "COMPLETED" } },
  });
  if (openRequirements) return;
  const version = await prisma.legalDocumentVersion.findUnique({
    where: { id },
    include: { document: { select: { internal: true } } },
  });
  if (!version) return;
  const mayPublish = canPublishLegalVersion({
    status: version.status,
    internal: version.document.internal,
    version: version.version,
    contentHash: version.contentHash,
    effectiveAt,
    legalReviewerName: reviewerName,
    legalReviewReference: reviewReference,
    companyApproved: version.status === "COMPANY_APPROVED",
    pendingFields: version.pendingFields,
  });
  if (!mayPublish || openRequirements) return;

  await prisma.legalDocumentVersion.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      approvedAt: new Date(),
      publishedAt: new Date(),
      effectiveAt,
      approverId: session.user.id,
      legalReviewerName: reviewerName,
      legalReviewNote: reviewNote,
      legalReviewReference: reviewReference,
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason: "Versao juridica publicada apos registro manual de revisao",
  });
  revalidatePath("/admin/juridico");
}

async function unpublishVersion(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const version = await prisma.legalDocumentVersion.findUnique({
    where: { id },
    include: { document: { select: { internal: true, name: true } } },
  });
  if (
    !version ||
    version.document.internal ||
    !["PUBLISHED", OPERATIONAL_LEGAL_STATUS].includes(version.status)
  ) return;
  await prisma.legalDocumentVersion.update({
    where: { id },
    data: {
      status: "REVOKED",
      archivedAt: new Date(),
      publishedAt: null,
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: id,
    reason: `Versao juridica despublicada/revogada para ${version.document.name}`,
  });
  revalidatePath("/admin/juridico");
}

export default async function AdminLegalPage() {
  await requireAdmin("legal:manage");
  const [documents, openRequirements] = await Promise.all([
    prisma.legalDocument.findMany({
      orderBy: { name: "asc" },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.publicationRequirement.count({
      where: { requiredForPublish: true, status: { not: "COMPLETED" } },
    }),
  ]);
  const pending = legalPendingFields();

  return (
    <div>
      <AdminHeader
        title="Juridico e Privacidade"
        subtitle="Documentos versionados. Rascunhos com pendencias nao podem ser publicados."
        action={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/juridico/pendencias" style={buttonStyle}>Pendencias ({openRequirements})</Link>
            <Link href="/admin/juridico/governanca" style={buttonStyle}>Governanca operacional</Link>
            <Link href="/admin/juridico/exclusoes" style={buttonStyle}>Exclusoes e retencoes</Link>
            <a href="/api/admin/legal/export" style={buttonStyle}>Exportar pacote</a>
          </div>
        )}
      />
      <AdminPanel>
        <p style={{ color: "#cbd5e1", marginTop: 0 }}>
          Status disponiveis: {LEGAL_DOCUMENT_STATUSES.join(", ")}. A publicacao operacional nao representa aprovacao da advogada.
        </p>
        <p style={{ color: pending.length ? "#f59e0b" : "#22c55e" }}>
          {pending.length || openRequirements
            ? `Publicacao bloqueada. Campos de ambiente: ${pending.join(", ") || "nenhum"}. Pendencias administrativas: ${openRequirements}.`
            : "Campos empresariais basicos preenchidos. A revisao juridica, aprovacao empresarial e data de vigencia continuam obrigatorias."}
        </p>
        <form action={initializeDrafts}><button style={buttonStyle}>Criar ou sincronizar {LEGAL_DOCUMENT_DEFINITIONS.length} rascunhos</button></form>
      </AdminPanel>
      <div style={{ height: 16 }} />
      <AdminPanel>
        <AdminTable>
          <thead><tr><th style={thStyle}>Documento</th><th style={thStyle}>Versao</th><th style={thStyle}>Status</th><th style={thStyle}>Hash / historico</th><th style={thStyle}>Pendencias</th><th style={thStyle}>Publicacao controlada</th></tr></thead>
          <tbody>
            {documents.map((document) => {
              const version = document.versions[0];
              const versionPendingFields = Array.isArray(version?.pendingFields) ? version.pendingFields.map(String) : [];
              const publishEnabled = version
                ? canPublishLegalVersion({
                    status: version.status,
                    internal: document.internal,
                    version: version.version,
                    contentHash: version.contentHash,
                    effectiveAt: version.effectiveAt,
                    legalReviewerName: version.legalReviewerName,
                    legalReviewReference: version.legalReviewReference,
                    companyApproved: version.status === "COMPANY_APPROVED",
                    pendingFields: version.pendingFields,
                  }) && openRequirements === 0 && pending.length === 0
                : false;
              return (
                <tr key={document.id}>
                  <td style={tdStyle}><strong>{document.name}</strong><br />{document.type} / {document.audience}</td>
                  <td style={tdStyle}>{version?.version ?? "-"}</td>
                  <td style={tdStyle}><StatusPill tone={["PUBLISHED", OPERATIONAL_LEGAL_STATUS].includes(version?.status ?? "") ? "success" : "warning"}>{version?.status ?? "SEM VERSAO"}</StatusPill></td>
                  <td style={tdStyle}>
                    <code>{version?.contentHash.slice(0, 16) ?? "-"}</code>
                    <br />
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      Criado: {version?.createdAt ? version.createdAt.toLocaleString("pt-BR") : "-"}<br />
                      Aprovado: {version?.approvedAt ? version.approvedAt.toLocaleString("pt-BR") : "-"}<br />
                      Publicado operacionalmente: {version?.publishedAt ? version.publishedAt.toLocaleString("pt-BR") : "-"}<br />
                      Responsavel operacional: {version?.operationalPublisherName ?? "-"}<br />
                      Vigencia: {version?.effectiveAt ? version.effectiveAt.toLocaleDateString("pt-BR") : "-"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {versionPendingFields.length ? (
                      <span style={{ color: "#f59e0b" }}>{versionPendingFields.join(", ")}</span>
                    ) : (
                      <span style={{ color: "#22c55e" }}>Sem pendencia tecnica registrada</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {document.internal ? (
                      <span style={{ color: "#f59e0b", fontWeight: 800 }}>
                        Uso interno. Publicacao indisponivel.
                      </span>
                    ) : version ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>
                          Operacional: BRUNO MORAES DA ROCHA<br />
                          Empresa: Larissa de Campos Lacerda Souza<br />
                          Advogada: preencher na revisao
                        </div>
                        {version.status === "READY_FOR_LEGAL_REVIEW" ? (
                          <form action={requestLegalReview}>
                            <input type="hidden" name="id" value={version.id} />
                            <button style={buttonStyle}>Solicitar revisao juridica</button>
                          </form>
                        ) : null}
                        {["READY_FOR_LEGAL_REVIEW", "LEGAL_REVIEW_REQUESTED", OPERATIONAL_LEGAL_STATUS].includes(version.status) ? (
                          <form action={publishOperationalVersion}>
                            <input type="hidden" name="id" value={version.id} />
                            <button style={buttonStyle}>
                              {version.status === OPERATIONAL_LEGAL_STATUS
                                ? "Republicar versao operacional"
                                : "Publicar versao operacional"}
                            </button>
                          </form>
                        ) : null}
                        <form action={publishVersion} style={{ display: "grid", gap: 6 }}>
                          <input type="hidden" name="id" value={version.id} />
                          <input name="reviewerName" placeholder="Nome da advogada revisora" required style={inputStyle} />
                          <input name="reviewReference" placeholder="Referencia/assinatura da revisao" required style={inputStyle} />
                          <input name="effectiveAt" type="date" required style={inputStyle} />
                          <input name="reviewNote" placeholder="Observacao da revisao" required style={inputStyle} />
                          <button disabled={!publishEnabled} style={{ ...buttonStyle, opacity: publishEnabled ? 1 : .45 }}>Publicar versao</button>
                        </form>
                        <form action={unpublishVersion}>
                          <input type="hidden" name="id" value={version.id} />
                          <button
                            disabled={!["PUBLISHED", OPERATIONAL_LEGAL_STATUS].includes(version.status)}
                            style={{
                              ...buttonStyle,
                              opacity: ["PUBLISHED", OPERATIONAL_LEGAL_STATUS].includes(version.status) ? 1 : .45,
                            }}
                          >
                            Despublicar/revogar
                          </button>
                        </form>
                      </div>
                    ) : "Sem versao"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

const inputStyle = {
  background: "#050506",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 8,
  color: "#fff",
  padding: 8,
};
