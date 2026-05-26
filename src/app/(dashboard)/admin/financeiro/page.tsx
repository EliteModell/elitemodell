import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, StatCard, tdStyle, thStyle } from "../_components/AdminPrimitives";
import { applyPaidPaymentEffects } from "@/lib/payment-effects";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function activatePayment(formData: FormData) {
  "use server";
  await requireAdmin("finance:view");
  const paymentId = String(formData.get("paymentId") ?? "");
  if (paymentId) await applyPaidPaymentEffects(paymentId);
  revalidatePath("/admin/financeiro");
}

async function cancelPayment(formData: FormData) {
  "use server";
  await requireAdmin("finance:view");
  const paymentId = String(formData.get("paymentId") ?? "");
  if (paymentId) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: { not: "PAID" } },
      data: { status: "FAILED" },
    });
  }
  revalidatePath("/admin/financeiro");
}

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
          <thead><tr><th style={thStyle}>Usuario</th><th style={thStyle}>Plano/Pedido</th><th style={thStyle}>Valor</th><th style={thStyle}>Metodo</th><th style={thStyle}>Status</th><th style={thStyle}>Data</th><th style={thStyle}>Acoes</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={tdStyle}>{payment.user?.name ?? payment.user?.email ?? "Sem usuario"}</td>
                <td style={tdStyle}>{payment.externalReference?.startsWith("professional-plan:") ? payment.externalReference.split(":")[1] : payment.externalReference ?? payment.bookingId ?? "-"}</td>
                <td style={tdStyle}>R$ {payment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td style={tdStyle}>{payment.provider} / {payment.method}</td>
                <td style={tdStyle}>{payment.status}</td>
                <td style={tdStyle}>{payment.createdAt.toLocaleString("pt-BR")}</td>
                <td style={tdStyle}>
                  {payment.status !== "PAID" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <form action={activatePayment}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <button type="submit" style={{ border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)", color: "#22c55e", borderRadius: 8, padding: "7px 10px", fontWeight: 800, cursor: "pointer" }}>Ativar</button>
                      </form>
                      <form action={cancelPayment}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <button type="submit" style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#ef4444", borderRadius: 8, padding: "7px 10px", fontWeight: 800, cursor: "pointer" }}>Cancelar</button>
                      </form>
                    </div>
                  ) : "Aplicado"}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
