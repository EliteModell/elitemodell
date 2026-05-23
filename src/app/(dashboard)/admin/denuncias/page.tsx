import { revalidatePath } from "next/cache";
import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

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
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { author: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <AdminHeader title="Denuncias" subtitle="Denuncias contra perfis, clientes, anfitrioes, imoveis e conteudo. Priorize risco legal e seguranca." />
      <AdminPanel>
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
            {!reports.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma denuncia encontrada.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
