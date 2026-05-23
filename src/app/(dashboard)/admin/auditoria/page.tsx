import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage() {
  await requireAdmin("audit:view");
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 200,
    include: { admin: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <AdminHeader title="Auditoria" subtitle="Registro de acoes administrativas sensiveis: aprovacoes, reprovacoes, bloqueios, alteracoes e acessos." />
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Data/hora</th>
              <th style={thStyle}>Admin</th>
              <th style={thStyle}>Acao</th>
              <th style={thStyle}>Entidade</th>
              <th style={thStyle}>Motivo</th>
              <th style={thStyle}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={tdStyle}>{log.timestamp.toLocaleString("pt-BR")}</td>
                <td style={tdStyle}>{log.admin.name ?? log.admin.email ?? log.adminId}</td>
                <td style={tdStyle}>{log.action}</td>
                <td style={tdStyle}>{log.targetType}<br />{log.targetId}</td>
                <td style={tdStyle}>{log.reason ?? "-"}</td>
                <td style={tdStyle}>{log.ipAddress ?? "-"}</td>
              </tr>
            ))}
            {!logs.length ? <tr><td style={tdStyle} colSpan={6}>Nenhum log registrado ainda.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
