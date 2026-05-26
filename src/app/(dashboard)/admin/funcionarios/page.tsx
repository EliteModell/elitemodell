import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission, requireAdmin, resolveAdminRole } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function promoteStaff(formData: FormData) {
  "use server";
  const { session, adminRole } = await requireAdmin("dashboard:view");
  if (!hasAdminPermission(adminRole, "staff:manage")) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  const user = await prisma.user.update({ where: { email }, data: { role: "ADMIN" }, select: { id: true } }).catch(() => null);
  if (!user) return;
  await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "USER", targetId: user.id, reason: "Funcionario promovido a ADMIN" });
  revalidatePath("/admin/funcionarios");
}

async function deactivateStaff(formData: FormData) {
  "use server";
  const { session, adminRole } = await requireAdmin("dashboard:view");
  if (!hasAdminPermission(adminRole, "staff:manage")) return;
  const id = String(formData.get("id") ?? "");
  if (!id || id === session.user.id) return;
  await prisma.user.update({ where: { id }, data: { role: "GUEST", accountType: "client" } });
  await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "USER", targetId: id, reason: "Acesso administrativo removido" });
  revalidatePath("/admin/funcionarios");
}

export default async function AdminFuncionariosPage() {
  const { adminRole } = await requireAdmin("dashboard:view");
  const canManage = hasAdminPermission(adminRole, "staff:manage");
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true, blocked: true },
  });

  return (
    <div>
      <AdminHeader title="Funcionarios e administradores" subtitle="Controle de acesso interno. ADMIN_MASTER e definido por ADMIN_MASTER_EMAILS no ambiente; demais admins entram como ADMIN_GERAL." />

      <AdminPanel>
        <h2 style={{ margin: "0 0 12px", color: "#fff", fontSize: 16 }}>Criar novo funcionario</h2>
        <form action={promoteStaff} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input name="email" type="email" placeholder="e-mail do usuário cadastrado" disabled={!canManage} style={{ minWidth: 260, flex: 1, background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 10 }} />
          <button disabled={!canManage} style={{ ...buttonStyle, opacity: canManage ? 1 : 0.45 }}>Promover a ADMIN</button>
        </form>
        {!canManage ? <p style={{ color: "#f97316", margin: "10px 0 0", fontSize: 13 }}>Somente ADMIN_MASTER pode criar/remover administradores. Configure ADMIN_MASTER_EMAILS com seu email.</p> : null}
      </AdminPanel>

      <div style={{ height: 16 }} />

      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Funcionario</th>
              <th style={thStyle}>Cargo</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Ultima atividade</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const role = resolveAdminRole(admin.email);
              return (
                <tr key={admin.id}>
                  <td style={tdStyle}><strong>{admin.name ?? "Sem nome"}</strong><br />{admin.email}<br />{admin.phone ?? "-"}</td>
                  <td style={tdStyle}>{role}<br /><span style={{ color: "#94a3b8" }}>Permissoes: perfil operacional</span></td>
                  <td style={tdStyle}><StatusPill tone={admin.blocked ? "danger" : "success"}>{admin.blocked ? "INATIVO" : "ATIVO"}</StatusPill></td>
                  <td style={tdStyle}>{admin.updatedAt.toLocaleString("pt-BR")}</td>
                  <td style={tdStyle}>
                    <form action={deactivateStaff}>
                      <input type="hidden" name="id" value={admin.id} />
                      <button disabled={!canManage || role === "ADMIN_MASTER"} style={{ ...buttonStyle, color: "#ef4444", opacity: !canManage || role === "ADMIN_MASTER" ? 0.45 : 1 }}>Remover acesso</button>
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
