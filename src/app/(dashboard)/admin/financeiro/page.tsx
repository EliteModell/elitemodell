import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, StatCard, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

export default async function AdminFinanceiroPage() {
  await requireAdmin("finance:view");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [paid, pending, failed, payments] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { user: { select: { name: true, email: true } } } }),
  ]);

  return (
    <div>
      <AdminHeader title="Financeiro" subtitle="Pagamentos, planos, assinaturas, repasses e receita estimada." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label="Receita paga no mes" value={`R$ ${(paid._sum.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="success" />
        <StatCard label="Pagamentos pagos" value={paid._count} />
        <StatCard label="Valor pendente" value={`R$ ${(pending._sum.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="warning" />
        <StatCard label="Falhas" value={failed} tone="danger" />
      </div>
      <AdminPanel>
        <AdminTable>
          <thead><tr><th style={thStyle}>Usuario</th><th style={thStyle}>Valor</th><th style={thStyle}>Metodo</th><th style={thStyle}>Status</th><th style={thStyle}>Data</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={tdStyle}>{payment.user?.name ?? payment.user?.email ?? "Sem usuario"}</td>
                <td style={tdStyle}>R$ {payment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td style={tdStyle}>{payment.provider} / {payment.method}</td>
                <td style={tdStyle}>{payment.status}</td>
                <td style={tdStyle}>{payment.createdAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
