import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import {
  AdminHeader,
  AdminPanel,
  AdminTable,
  StatCard,
  StatusPill,
  buttonStyle,
  tdStyle,
  thStyle,
} from "../../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function updateDeletionJob(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("privacy:manage");
  const jobId = String(formData.get("jobId") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!jobId || reason.length < 8) return;

  const current = await prisma.dataDeletionJob.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, status: true, legalHold: true },
  });
  if (!current) return;

  if (action === "RETRY" && ["FAILED", "RETRY"].includes(current.status)) {
    await prisma.dataDeletionJob.update({
      where: { id: jobId },
      data: { status: "PENDING", attempts: 0, nextAttemptAt: null, errorSummary: null },
    });
  } else if (action === "HOLD") {
    await prisma.dataDeletionJob.update({
      where: { id: jobId },
      data: {
        legalHold: true,
        legalHoldReason: reason,
        status: "LEGAL_HOLD",
        nextAttemptAt: null,
      },
    });
  } else if (action === "RELEASE" && current.legalHold) {
    await prisma.dataDeletionJob.update({
      where: { id: jobId },
      data: { legalHold: false, legalHoldReason: null, status: "PENDING", nextAttemptAt: null },
    });
  } else {
    return;
  }

  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "USER",
    targetId: current.userId,
    reason,
    changes: { deletionJobId: jobId, action, previousStatus: current.status },
  });
  revalidatePath("/admin/juridico/exclusoes");
}

function tone(status: string) {
  if (["COMPLETED", "COMPLETED_WITH_PRESERVATION", "SIMULATED"].includes(status)) {
    return "success" as const;
  }
  if (status === "FAILED") return "danger" as const;
  if (["LEGAL_HOLD", "RETRY"].includes(status)) return "warning" as const;
  return "neutral" as const;
}

export default async function AdminDeletionJobsPage() {
  await requireAdmin("privacy:manage");
  const [jobs, pending, failures, holds] = await Promise.all([
    prisma.dataDeletionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true, name: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.dataDeletionJob.count({ where: { status: { in: ["PENDING", "PROCESSING", "RETRY"] } } }),
    prisma.dataDeletionJob.count({ where: { status: "FAILED" } }),
    prisma.dataDeletionJob.count({ where: { legalHold: true } }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Exclusoes e retencoes"
        subtitle="Fila auditada de direitos LGPD. Reprocessamento apenas agenda o job; a execucao ocorre pelo worker protegido."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label="Na fila" value={pending} tone="warning" />
        <StatCard label="Falhas" value={failures} tone={failures ? "danger" : "neutral"} />
        <StatCard label="Bloqueios legais" value={holds} tone={holds ? "warning" : "neutral"} />
        <StatCard label="Jobs exibidos" value={jobs.length} />
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Titular</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Etapas</th>
              <th style={thStyle}>Tentativas</th>
              <th style={thStyle}>Comprovante</th>
              <th style={thStyle}>Erro / retencao</th>
              <th style={thStyle}>Controle</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const completed = job.items.filter((item) => item.status === "COMPLETED").length;
              return (
                <tr key={job.id}>
                  <td style={tdStyle}>
                    <strong>{job.user.name || "Titular"}</strong><br />
                    {job.user.email}<br />
                    <small>{job.createdAt.toLocaleString("pt-BR")}</small>
                  </td>
                  <td style={tdStyle}>
                    <StatusPill tone={tone(job.status)}>{job.status}</StatusPill><br />
                    <small>{job.mode}</small>
                  </td>
                  <td style={tdStyle}>{completed}/{job.items.length || 1}</td>
                  <td style={tdStyle}>{job.attempts}/{job.maxAttempts}</td>
                  <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>
                    <code>{job.receiptHash?.slice(0, 20) || "-"}</code>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 260 }}>
                    {job.legalHoldReason || job.errorSummary || "Sem ocorrencias."}
                  </td>
                  <td style={tdStyle}>
                    <form action={updateDeletionJob} style={{ display: "grid", gap: 7, minWidth: 210 }}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input name="reason" minLength={8} required placeholder="Justificativa obrigatoria" style={inputStyle} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {["FAILED", "RETRY"].includes(job.status) ? (
                          <button name="action" value="RETRY" style={buttonStyle}>Reagendar</button>
                        ) : null}
                        {job.legalHold ? (
                          <button name="action" value="RELEASE" style={buttonStyle}>Liberar retencao</button>
                        ) : (
                          <button name="action" value="HOLD" style={buttonStyle}>Bloqueio legal</button>
                        )}
                      </div>
                    </form>
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

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 8,
  background: "#050506",
  color: "#fff",
  padding: 8,
};
