import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPagination, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

async function toggleClientBlock(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("clients:manage");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["block", "unblock"].includes(action)) return;

  await prisma.user.update({
    where: { id },
    data: {
      blocked: action === "block",
      blockReason: action === "block" ? reason || "Bloqueado pela administracao." : null,
      blockedAt: action === "block" ? new Date() : null,
    },
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "block" ? "USER_BLOCKED" : "USER_UNBLOCKED",
    targetType: "USER",
    targetId: id,
    reason: reason || action,
  });
  revalidatePath("/admin/clientes");
}

export default async function AdminClientesPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  await requireAdmin("clients:manage");
  const params = await searchParams;
  const parsedPage = Number(params?.page ?? "1");
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const where = { role: "GUEST" as const, accountType: { not: "host" } };
  const [total, clients] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      clientStatus: true,
      blocked: true,
      blockReason: true,
      createdAt: true,
      _count: { select: { favorites: true, reportsCreated: true } },
    },
  })]);

  return (
    <div>
      <AdminHeader title="Clientes" subtitle="Lista operacional de clientes, verificação, favoritos e denúncias relacionadas." />
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Atividade</th>
              <th style={thStyle}>Cadastro</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={tdStyle}><strong>{client.name ?? "Sem nome"}</strong><br />{client.email}<br />{client.phone ?? "-"}</td>
                <td style={tdStyle}>
                  <StatusPill tone={client.blocked ? "danger" : client.clientStatus === "VERIFIED" ? "success" : "warning"}>
                    {client.blocked ? "BLOQUEADO" : client.clientStatus}
                  </StatusPill>
                  {client.blockReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{client.blockReason}</p> : null}
                </td>
                <td style={tdStyle}>{client._count.favorites} favoritos<br />{client._count.reportsCreated} denuncias feitas</td>
                <td style={tdStyle}>{client.createdAt.toLocaleDateString("pt-BR")}</td>
                <td style={tdStyle}>
                  <form action={toggleClientBlock} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={client.id} />
                    <input name="reason" placeholder="Motivo" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <button name="action" value={client.blocked ? "unblock" : "block"} style={{ ...buttonStyle, color: client.blocked ? "#22c55e" : "#ef4444" }}>
                      {client.blocked ? "Reativar" : "Bloquear"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <AdminPagination basePath="/admin/clientes" page={page} pageSize={PAGE_SIZE} total={total} />
      </AdminPanel>
    </div>
  );
}
