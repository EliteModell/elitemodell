import { revalidatePath } from "next/cache";
import Link from "next/link";
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

async function updateRequirement(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("legal:manage");
  const id = String(formData.get("id") || "");
  const owner = String(formData.get("owner") || "").trim();
  const value = String(formData.get("value") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const status = String(formData.get("status") || "IN_PROGRESS");
  const dueAtRaw = String(formData.get("dueAt") || "");
  if (!id || owner.length < 2 || notes.length < 4) return;
  if (!["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"].includes(status)) return;
  if (status === "COMPLETED" && value.length < 3) return;

  const current = await prisma.publicationRequirement.findUnique({ where: { id } });
  if (!current) return;
  const dueAt = dueAtRaw ? new Date(`${dueAtRaw}T12:00:00`) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return;

  await prisma.publicationRequirement.update({
    where: { id },
    data: {
      owner,
      value: value || null,
      status,
      dueAt,
      completedAt: status === "COMPLETED" ? new Date() : null,
      completedById: status === "COMPLETED" ? session.user.id : null,
      history: {
        create: {
          actorId: session.user.id,
          fromStatus: current.status,
          toStatus: status,
          previousValue: current.value,
          nextValue: value || null,
          notes,
        },
      },
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: current.key,
    reason: notes,
    changes: { previousStatus: current.status, status, owner, dueAt, valueConfigured: Boolean(value) },
  });
  revalidatePath("/admin/juridico");
  revalidatePath("/admin/juridico/pendencias");
}

function tone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  return "neutral" as const;
}

export default async function PublicationRequirementsPage() {
  await requireAdmin("legal:manage");
  const requirements = await prisma.publicationRequirement.findMany({
    orderBy: [{ requiredForPublish: "desc" }, { createdAt: "asc" }],
    include: { history: { orderBy: { createdAt: "desc" }, take: 3 } },
  });
  const pending = requirements.filter((item) => item.requiredForPublish && item.status !== "COMPLETED").length;
  const overdue = requirements.filter((item) => item.dueAt && item.dueAt < new Date() && item.status !== "COMPLETED").length;

  return (
    <div>
      <AdminHeader
        title="Pendencias para publicacao"
        subtitle="Decisoes empresariais e operacionais. Documentos publicos permanecem bloqueados enquanto houver requisito obrigatorio incompleto."
        action={<Link href="/admin/juridico" style={buttonStyle}>Voltar aos documentos</Link>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label="Obrigatorias pendentes" value={pending} tone={pending ? "danger" : "success"} />
        <StatCard label="Prazos vencidos" value={overdue} tone={overdue ? "danger" : "neutral"} />
        <StatCard label="Concluidas" value={requirements.filter((item) => item.status === "COMPLETED").length} tone="success" />
        <StatCard label="Total controlado" value={requirements.length} />
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Informacao e motivo</th>
              <th style={thStyle}>Responsavel / prazo</th>
              <th style={thStyle}>Impacto</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Preencher</th>
              <th style={thStyle}>Historico</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((item) => (
              <tr key={item.id}>
                <td style={{ ...tdStyle, maxWidth: 280 }}>
                  <strong>{item.information}</strong><br />
                  <small>{item.reason}</small>
                </td>
                <td style={tdStyle}>
                  {item.owner || "Nao definido"}<br />
                  {item.dueAt?.toLocaleDateString("pt-BR") || "Sem prazo"}
                </td>
                <td style={tdStyle}>
                  Documento: {item.documentKey || "-"}<br />
                  Funcionalidade: {item.affectedFeature || "-"}<br />
                  <small>{item.requiredForPublish ? "Bloqueia publicacao" : "Nao bloqueia minutas"}</small>
                </td>
                <td style={tdStyle}><StatusPill tone={tone(item.status)}>{item.status}</StatusPill></td>
                <td style={tdStyle}>
                  <form action={updateRequirement} style={{ display: "grid", gap: 7, minWidth: 260 }}>
                    <input type="hidden" name="id" value={item.id} />
                    <input name="owner" required defaultValue={item.owner || ""} placeholder="Responsavel" style={inputStyle} />
                    <input name="dueAt" type="date" defaultValue={item.dueAt?.toISOString().slice(0, 10) || ""} style={inputStyle} />
                    <textarea name="value" defaultValue={item.value || ""} placeholder="Informacao/configuracao aprovada" rows={3} style={inputStyle} />
                    <select name="status" defaultValue={item.status} style={inputStyle}>
                      <option value="PENDING">Pendente</option>
                      <option value="IN_PROGRESS">Em andamento</option>
                      <option value="BLOCKED">Bloqueada</option>
                      <option value="COMPLETED">Concluida</option>
                    </select>
                    <input name="notes" required minLength={4} placeholder="Nota da alteracao" style={inputStyle} />
                    <button style={buttonStyle}>Salvar e auditar</button>
                  </form>
                </td>
                <td style={{ ...tdStyle, minWidth: 220 }}>
                  {item.history.length
                    ? item.history.map((entry) => (
                        <div key={entry.id} style={{ marginBottom: 7 }}>
                          <strong>{entry.fromStatus || "-"} → {entry.toStatus || "-"}</strong><br />
                          <small>{entry.createdAt.toLocaleString("pt-BR")} · {entry.notes}</small>
                        </div>
                      ))
                    : "Sem alteracoes"}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 8,
  background: "#050506",
  color: "#fff",
  padding: 8,
};
