import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

export default async function AdminSuportePage() {
  await requireAdmin("support:manage");
  const [recentMessages, reports] = await Promise.all([
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { sender: { select: { name: true, email: true } }, booking: { select: { id: true, status: true } } },
    }),
    prisma.report.findMany({
      where: { status: { in: ["PENDING", "REVIEWING"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      <AdminHeader title="Suporte" subtitle="Fila operacional de mensagens recentes e solicitacoes que precisam de acompanhamento humano." />
      <AdminPanel>
        <h2 style={{ color: "#fff", margin: "0 0 14px", fontSize: 16 }}>Chamados e denuncias abertas</h2>
        <AdminTable>
          <thead><tr><th style={thStyle}>Origem</th><th style={thStyle}>Solicitante</th><th style={thStyle}>Resumo</th><th style={thStyle}>Status</th></tr></thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td style={tdStyle}>Denuncia</td>
                <td style={tdStyle}>{report.author.name ?? report.author.email}</td>
                <td style={tdStyle}>{report.reason}<br />{report.description}</td>
                <td style={tdStyle}><StatusPill tone={report.status === "PENDING" ? "danger" : "warning"}>{report.status}</StatusPill></td>
              </tr>
            ))}
            {!reports.length ? <tr><td style={tdStyle} colSpan={4}>Nenhum chamado aberto.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
      <div style={{ height: 16 }} />
      <AdminPanel>
        <h2 style={{ color: "#fff", margin: "0 0 14px", fontSize: 16 }}>Mensagens recentes</h2>
        <AdminTable>
          <thead><tr><th style={thStyle}>Remetente</th><th style={thStyle}>Reserva</th><th style={thStyle}>Mensagem</th><th style={thStyle}>Data</th></tr></thead>
          <tbody>
            {recentMessages.map((message) => (
              <tr key={message.id}>
                <td style={tdStyle}>{message.sender.name ?? message.sender.email}</td>
                <td style={tdStyle}>{message.booking.id}<br />{message.booking.status}</td>
                <td style={tdStyle}>{message.content.slice(0, 160)}</td>
                <td style={tdStyle}>{message.createdAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {!recentMessages.length ? <tr><td style={tdStyle} colSpan={4}>Nenhuma mensagem recente.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
