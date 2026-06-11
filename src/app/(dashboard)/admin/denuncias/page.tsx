import { revalidatePath } from "next/cache";
import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const moderationStatuses = [
  "IN_REVIEW",
  "RESOLVED",
  "DISMISSED",
  "APPEAL_REQUESTED",
  "ESCALATED_TO_LEGAL",
] as const;

function auditTargetType(targetType: string): "PROFESSIONAL" | "PROPERTY" | "CONTENT" {
  if (targetType === "PROFESSIONAL") return "PROFESSIONAL";
  if (targetType === "PROPERTY") return "PROPERTY";
  return "CONTENT";
}

function moderationTone(status: string, priority: string): "neutral" | "warning" | "success" | "danger" {
  if (priority === "CRITICAL" || status === "EMERGENCY") return "danger";
  if (status === "RESOLVED" || status === "DISMISSED") return "success";
  if (status === "IN_REVIEW" || status === "APPEAL_REQUESTED" || status === "ESCALATED_TO_LEGAL") return "warning";
  return "neutral";
}

async function updateModerationCase(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 1000);
  if (!id || !moderationStatuses.includes(status as (typeof moderationStatuses)[number])) return;

  const current = await prisma.moderationCase.findUnique({
    where: { id },
    select: { status: true, targetType: true, targetId: true },
  });
  if (!current) return;

  await prisma.$transaction([
    prisma.moderationCase.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
      },
      select: { id: true },
    }),
    prisma.moderationCaseEvent.create({
      data: {
        caseId: id,
        actorId: session.user.id,
        type: `ADMIN_${status}`,
        fromStatus: current.status,
        toStatus: status,
        notes: reason || `Atualizado para ${status}`,
        metadata: { source: "admin-denuncias" },
      },
    }),
  ]);

  await logAudit({
    adminId: session.user.id,
    action: "CONTENT_FLAGGED",
    targetType: auditTargetType(current.targetType),
    targetId: current.targetId,
    reason: reason || `moderation-case:${status}`,
  });
  revalidatePath("/admin/denuncias");
}

async function updateReport(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReportStatus;
  const reason = String(formData.get("reason") ?? "");
  if (!id || !Object.values(ReportStatus).includes(status)) return;
  await prisma.report.update({ where: { id }, data: { status } });
  await logAudit({ adminId: session.user.id, action: "CONTENT_FLAGGED", targetType: "CONTENT", targetId: id, reason: reason || `report:${status}` });
  revalidatePath("/admin/denuncias");
}

export default async function AdminDenunciasPage() {
  await requireAdmin("reports:manage");
  const [cases, reports] = await Promise.all([
    prisma.moderationCase.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 5 },
        evidence: { orderBy: { preservedAt: "desc" }, take: 5 },
      },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { author: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Denuncias"
        subtitle="Casos emergenciais aplicam retirada cautelar, preservam evidencia e exigem decisao humana registrada."
      />

      <AdminPanel>
        <h2 style={{ margin: "0 0 12px", color: "#fff", fontSize: 18 }}>Casos de moderacao juridica</h2>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Caso</th>
              <th style={thStyle}>Alvo</th>
              <th style={thStyle}>Evidencia</th>
              <th style={thStyle}>Historico</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((moderationCase) => (
              <tr key={moderationCase.id}>
                <td style={tdStyle}>
                  <strong>{moderationCase.protocol}</strong><br />
                  {moderationCase.reason}<br />
                  <StatusPill tone={moderationTone(moderationCase.status, moderationCase.priority)}>
                    {moderationCase.status}
                  </StatusPill>
                  <br />
                  <small>Prioridade: {moderationCase.priority}</small><br />
                  <small>Restrito: {moderationCase.restrictedAt ? moderationCase.restrictedAt.toLocaleString("pt-BR") : "-"}</small>
                </td>
                <td style={tdStyle}>{moderationCase.targetType}<br />{moderationCase.targetId}</td>
                <td style={tdStyle}>
                  {moderationCase.evidence.map((item) => (
                    <div key={item.id}>
                      <strong>{item.mimeType}</strong><br />
                      <small>{item.fileHash.slice(0, 16)}...</small><br />
                      <small>{item.legalHold ? "legal hold" : "sem hold"}</small>
                    </div>
                  ))}
                  {!moderationCase.evidence.length ? "Sem evidencia preservada." : null}
                </td>
                <td style={tdStyle}>
                  {moderationCase.events.map((event) => (
                    <div key={event.id} style={{ marginBottom: 8 }}>
                      <strong>{event.type}</strong><br />
                      <small>{event.createdAt.toLocaleString("pt-BR")}</small><br />
                      <small>{event.notes ?? ""}</small>
                    </div>
                  ))}
                </td>
                <td style={tdStyle}>
                  <form action={updateModerationCase} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={moderationCase.id} />
                    <input name="reason" placeholder="Fundamento/observacao" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button name="status" value="IN_REVIEW" style={buttonStyle}>Analisar</button>
                      <button name="status" value="ESCALATED_TO_LEGAL" style={buttonStyle}>Advogada</button>
                      <button name="status" value="APPEAL_REQUESTED" style={buttonStyle}>Recurso</button>
                      <button name="status" value="RESOLVED" style={buttonStyle}>Resolver</button>
                      <button name="status" value="DISMISSED" style={buttonStyle}>Arquivar</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!cases.length ? <tr><td style={tdStyle} colSpan={5}>Nenhum caso juridico encontrado.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <div style={{ height: 18 }} />

      <AdminPanel>
        <h2 style={{ margin: "0 0 12px", color: "#fff", fontSize: 18 }}>Denuncias legadas</h2>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Denuncia</th>
              <th style={thStyle}>Alvo</th>
              <th style={thStyle}>Autor</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td style={tdStyle}><strong>{report.reason}</strong><br />{report.description}<br />{report.evidence.length} evidencia(s)</td>
                <td style={tdStyle}>{report.targetType}<br />{report.targetId}</td>
                <td style={tdStyle}>{report.author.name ?? "Sem nome"}<br />{report.author.email}</td>
                <td style={tdStyle}><StatusPill tone={report.status === "PENDING" ? "danger" : report.status === "REVIEWING" ? "warning" : "success"}>{report.status}</StatusPill></td>
                <td style={tdStyle}>
                  <form action={updateReport} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={report.id} />
                    <input name="reason" placeholder="Observacao interna" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button name="status" value="REVIEWING" style={buttonStyle}>Analisar</button>
                      <button name="status" value="RESOLVED" style={buttonStyle}>Resolver</button>
                      <button name="status" value="DISMISSED" style={buttonStyle}>Arquivar</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!reports.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma denuncia legada encontrada.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
