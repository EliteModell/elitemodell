import type { AdminRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLE_PERMISSIONS, requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const ROLES: AdminRole[] = [
  "ADMIN_MASTER",
  "ADMIN_GERAL",
  "MODERADOR_CADASTROS",
  "MODERADOR_CONTEUDO",
  "SUPORTE",
  "FINANCEIRO",
];

async function assignRole(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("staff:manage");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as AdminRole;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!email || !ROLES.includes(role) || reason.length < 4) return;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } }),
    prisma.adminRoleAssignment.updateMany({
      where: { userId: user.id, active: true, revokedAt: null },
      data: { active: false, revokedAt: new Date() },
    }),
    prisma.adminRoleAssignment.create({
      data: { userId: user.id, role, grantedById: session.user.id, reason },
    }),
  ]);
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "USER",
    targetId: user.id,
    changes: { role },
    reason: `Papel administrativo atribuido: ${reason}`,
  });
  revalidatePath("/admin/funcionarios");
}

async function revokeRole(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("staff:manage");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!assignmentId || reason.length < 4) return;
  const assignment = await prisma.adminRoleAssignment.findUnique({
    where: { id: assignmentId },
    select: { userId: true, role: true },
  });
  if (!assignment || assignment.userId === session.user.id) return;

  await prisma.$transaction([
    prisma.adminRoleAssignment.update({
      where: { id: assignmentId },
      data: { active: false, revokedAt: new Date(), reason: `Revogado: ${reason}` },
    }),
    prisma.adminMfaSession.updateMany({
      where: { userId: assignment.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  const remaining = await prisma.adminRoleAssignment.count({
    where: { userId: assignment.userId, active: true, revokedAt: null },
  });
  if (!remaining) {
    await prisma.user.update({ where: { id: assignment.userId }, data: { role: "GUEST" } });
  }
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "USER",
    targetId: assignment.userId,
    changes: { revokedRole: assignment.role },
    reason: `Acesso administrativo revogado: ${reason}`,
  });
  revalidatePath("/admin/funcionarios");
}

export default async function AdminFuncionariosPage() {
  await requireAdmin("staff:manage");
  const assignments = await prisma.adminRoleAssignment.findMany({
    orderBy: { grantedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, blocked: true, updatedAt: true } },
      grantedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <AdminHeader title="Funcionarios e administradores" subtitle="Papeis persistentes, menor privilegio e MFA obrigatorio para todo acesso administrativo." />
      <AdminPanel>
        <h2 style={{ margin: "0 0 12px", color: "#fff", fontSize: 16 }}>Atribuir papel</h2>
        <form action={assignRole} style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(190px,.7fr) minmax(240px,1fr) auto", gap: 10 }}>
          <input name="email" type="email" required placeholder="e-mail do usuario cadastrado" style={inputStyle} />
          <select name="role" required style={inputStyle}>
            {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <input name="reason" required minLength={4} placeholder="Justificativa obrigatoria" style={inputStyle} />
          <button style={buttonStyle}>Atribuir</button>
        </form>
      </AdminPanel>

      <div style={{ height: 16 }} />
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Funcionario</th>
              <th style={thStyle}>Papel e permissoes</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Concessao</th>
              <th style={thStyle}>Revogacao</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td style={tdStyle}><strong>{assignment.user.name ?? "Sem nome"}</strong><br />{assignment.user.email}</td>
                <td style={tdStyle}>{assignment.role}<br /><span style={{ color: "#94a3b8" }}>{ADMIN_ROLE_PERMISSIONS[assignment.role].join(", ")}</span></td>
                <td style={tdStyle}><StatusPill tone={assignment.active && !assignment.user.blocked ? "success" : "danger"}>{assignment.active && !assignment.user.blocked ? "ATIVO" : "INATIVO"}</StatusPill></td>
                <td style={tdStyle}>{assignment.grantedAt.toLocaleString("pt-BR")}<br />por {assignment.grantedBy?.name ?? assignment.grantedBy?.email ?? "migration"}</td>
                <td style={tdStyle}>
                  {assignment.active ? (
                    <form action={revokeRole} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <input name="reason" required minLength={4} placeholder="Justificativa" style={inputStyle} />
                      <button style={{ ...buttonStyle, color: "#ef4444" }}>Revogar</button>
                    </form>
                  ) : assignment.revokedAt?.toLocaleString("pt-BR") ?? "Revogado"}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

const inputStyle = {
  minHeight: 42,
  background: "#050506",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 8,
  color: "#fff",
  padding: "8px 10px",
};
