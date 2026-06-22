import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPagination, AdminPanel, AdminTable, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function AdminAuditoriaPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  await requireAdmin("audit:view");
  const params = await searchParams;
  const parsedPage = Number(params?.page ?? "1");
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const [total, logs] = await Promise.all([prisma.auditLog.count(), prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, timestamp: true, action: true, targetType: true, targetId: true,
      reason: true, ipAddress: true, actorIdentifier: true, adminId: true,
      admin: { select: { name: true, email: true } },
    },
  })]);

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
                <td style={tdStyle}>{log.admin?.name ?? log.admin?.email ?? log.actorIdentifier ?? log.adminId ?? "Administrador removido"}</td>
                <td style={tdStyle}>{log.action}</td>
                <td style={tdStyle}>{log.targetType}<br />{log.targetId}</td>
                <td style={tdStyle}>{log.reason ?? "-"}</td>
                <td style={tdStyle}>{log.ipAddress ?? "-"}</td>
              </tr>
            ))}
            {!logs.length ? <tr><td style={tdStyle} colSpan={6}>Nenhum log registrado ainda.</td></tr> : null}
          </tbody>
        </AdminTable>
        <AdminPagination basePath="/admin/auditoria" page={page} pageSize={PAGE_SIZE} total={total} />
      </AdminPanel>
    </div>
  );
}
