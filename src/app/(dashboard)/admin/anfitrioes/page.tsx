import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function reviewHost(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("hosts:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["approve", "reject", "suspend"].includes(action)) return;

  await prisma.$transaction(async (tx) => {
    if (action === "approve") {
      await tx.user.update({ where: { id }, data: { role: "HOST", accountType: "host", blockReason: null } });
      await tx.hostProfile.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
    }
    if (action === "reject") {
      await tx.property.updateMany({ where: { hostId: id, status: "PENDING_REVIEW" }, data: { status: "REJECTED" } });
      await tx.user.update({ where: { id }, data: { accountType: "client", blockReason: reason || "Cadastro de anfitriao reprovado." } });
    }
    if (action === "suspend") {
      await tx.property.updateMany({ where: { hostId: id }, data: { status: "INACTIVE" } });
      await tx.user.update({ where: { id }, data: { blocked: true, blockReason: reason || "Anfitriao suspenso pela administracao.", blockedAt: new Date() } });
    }
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "USER_VERIFIED" : "USER_BLOCKED",
    targetType: "USER",
    targetId: id,
    reason: reason || `host:${action}`,
  });
  revalidatePath("/admin/anfitrioes");
}

function hostStatus(user: { role: string; accountType: string; blocked: boolean; properties: { status: string }[] }) {
  if (user.blocked) return "SUSPENSO";
  if (user.role === "HOST" || user.accountType === "host") return "APROVADO";
  if (user.properties.some((property) => property.status === "PENDING_REVIEW")) return "PENDENTE_APROVACAO";
  if (user.properties.some((property) => property.status === "REJECTED")) return "REPROVADO";
  return "CADASTRO_INCOMPLETO";
}

export default async function AdminAnfitrioesPage() {
  await requireAdmin("hosts:review");
  const hosts = await prisma.user.findMany({
    where: {
      OR: [
        { accountType: "host" },
        { role: "HOST" },
        { properties: { some: {} } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      accountType: true,
      blocked: true,
      blockReason: true,
      createdAt: true,
      properties: { select: { id: true, title: true, status: true, city: true, pricePerNight: true } },
    },
  });

  return (
    <div>
      <AdminHeader title="Anfitriões" subtitle="Aprovação da identidade de anfitrião e revisão dos imóveis vinculados." />
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Anfitriao</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Imóveis</th>
              <th style={thStyle}>Envio</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((host) => {
              const status = hostStatus(host);
              return (
                <tr key={host.id}>
                  <td style={tdStyle}><strong>{host.name ?? "Sem nome"}</strong><br />{host.email}<br />{host.phone ?? "-"}</td>
                  <td style={tdStyle}>
                    <StatusPill tone={status === "APROVADO" ? "success" : status === "REPROVADO" || status === "SUSPENSO" ? "danger" : "warning"}>{status}</StatusPill>
                    {host.blockReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{host.blockReason}</p> : null}
                  </td>
                  <td style={tdStyle}>
                    {host.properties.length} imovel(is)
                    {host.properties.slice(0, 3).map((property) => (
                      <div key={property.id} style={{ color: "#94a3b8", marginTop: 4 }}>{property.title} - {property.status}</div>
                    ))}
                  </td>
                  <td style={tdStyle}>{host.createdAt.toLocaleDateString("pt-BR")}</td>
                  <td style={tdStyle}>
                    <form action={reviewHost} style={{ display: "grid", gap: 8 }}>
                      <input type="hidden" name="id" value={host.id} />
                      <input name="reason" placeholder="Motivo obrigatorio se reprovar/suspender" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                        <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar</button>
                        <button name="action" value="suspend" style={{ ...buttonStyle, color: "#f97316" }}>Suspender</button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!hosts.length ? <tr><td style={tdStyle} colSpan={5}>Nenhum anfitriao encontrado.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
