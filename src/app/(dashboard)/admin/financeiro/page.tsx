import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import {
  cancelPendingAsaasPayment,
  reconcileAsaasPayment,
  refundAsaasPaymentOperation,
} from "@/lib/payment-operations";
import { toCents } from "@/lib/money";
import {
  AdminHeader,
  AdminPanel,
  AdminTable,
  StatCard,
  StatusPill,
  buttonStyle,
  tdStyle,
  thStyle,
} from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

function describePaymentReference(payment: {
  externalReference: string | null;
  bookingId: string | null;
}) {
  if (payment.externalReference?.startsWith("professional-plan:")) {
    const [, planId, priceKey] = payment.externalReference.split(":");
    return `${planId ?? "plano"} / ${priceKey ?? "duracao"}`;
  }
  return payment.externalReference ?? payment.bookingId ?? "-";
}

function accountTypeLabel(user?: { accountType: string | null; role: string | null } | null) {
  if (!user) return "-";
  if (user.accountType === "model") return "Profissional";
  if (user.accountType === "host") return "Anfitriao";
  if (user.role === "ADMIN") return "Admin";
  return "Cliente";
}

function paymentTone(status: string) {
  if (status === "PAID") return "success" as const;
  if (["FAILED", "CHARGEBACK"].includes(status)) return "danger" as const;
  if (["PENDING", "PARTIALLY_REFUNDED"].includes(status)) return "warning" as const;
  return "neutral" as const;
}

function parseOptionalAmount(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  if (!raw) return undefined;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor de reembolso invalido.");
  return toCents(amount);
}

async function runFinancialAction(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("finance:adjust");
  const paymentId = String(formData.get("paymentId") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  const confirmation = String(formData.get("confirmation") || "").trim();
  const idempotencyBase = String(formData.get("idempotencyKey") || "");
  if (!paymentId || !idempotencyBase || reason.length < 8 || confirmation !== "CONFIRMAR") return;
  const amountCents = parseOptionalAmount(formData.get("amount"));
  const idempotencyKey = `${idempotencyBase}:${action}:${amountCents ?? "full"}`;

  const input = {
    paymentId,
    adminId: session.user.id,
    reason,
    confirmation,
    idempotencyKey,
  };
  if (action === "RECONCILE") {
    await reconcileAsaasPayment(input);
  } else if (action === "CANCEL") {
    await cancelPendingAsaasPayment(input);
  } else if (action === "REFUND") {
    await refundAsaasPaymentOperation({
      ...input,
      amountCents,
    });
  }
  revalidatePath("/admin/financeiro");
}

export default async function AdminFinanceiroPage() {
  await requireAdmin("finance:view");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [paid, pending, failed, refunds, payments] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "CHARGEBACK"] } } }),
    prisma.payment.aggregate({
      where: { refundedAt: { gte: monthStart } },
      _sum: { refundedAmountCents: true },
      _count: true,
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { name: true, email: true, accountType: true, role: true } },
        operations: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    }),
  ]);

  return (
    <div>
      <AdminHeader title="Financeiro" subtitle="Conciliação, cancelamento e reembolso consultam o Asaas e geram trilha administrativa." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label="Receita paga no mes" value={`R$ ${(paid._sum.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="success" />
        <StatCard label="Valor pendente" value={`R$ ${(pending._sum.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="warning" />
        <StatCard label="Falhas e estornos" value={failed} tone={failed ? "danger" : "neutral"} />
        <StatCard label="Reembolsado no mes" value={`R$ ${((refunds._sum.refundedAmountCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Usuario / pedido</th>
              <th style={thStyle}>Asaas</th>
              <th style={thStyle}>Valor</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Beneficio</th>
              <th style={thStyle}>Historico</th>
              <th style={thStyle}>Operacao confirmada</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={tdStyle}>
                  <strong>{payment.user?.name ?? payment.user?.email ?? "Sem usuario"}</strong><br />
                  {accountTypeLabel(payment.user)} / {describePaymentReference(payment)}<br />
                  <small>{payment.createdAt.toLocaleString("pt-BR")}</small>
                </td>
                <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>
                  {payment.providerPaymentId ?? "-"}<br />
                  <small>{payment.providerStatus ?? "sem conciliacao"}</small>
                </td>
                <td style={tdStyle}>
                  R$ {payment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<br />
                  {payment.refundedAmountCents ? (
                    <small>Reembolsado: R$ {(payment.refundedAmountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</small>
                  ) : null}
                </td>
                <td style={tdStyle}><StatusPill tone={paymentTone(payment.status)}>{payment.status}</StatusPill></td>
                <td style={tdStyle}>
                  <StatusPill tone={payment.benefitStatus === "APPLIED" ? "success" : payment.benefitStatus === "FAILED" ? "danger" : "neutral"}>
                    {payment.benefitStatus}
                  </StatusPill>
                  {payment.benefitError ? <p style={{ color: "#fca5a5", maxWidth: 220 }}>{payment.benefitError}</p> : null}
                </td>
                <td style={tdStyle}>
                  {payment.operations.length
                    ? payment.operations.map((operation) => (
                        <div key={operation.id} style={{ marginBottom: 6 }}>
                          <strong>{operation.type}</strong> / {operation.status}<br />
                          <small>{operation.createdAt.toLocaleString("pt-BR")}</small>
                        </div>
                      ))
                    : "Sem operacoes"}
                </td>
                <td style={tdStyle}>
                  {payment.providerPaymentId ? (
                    <form action={runFinancialAction} style={{ display: "grid", gap: 7, minWidth: 225 }}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input
                        name="reason"
                        required
                        minLength={8}
                        placeholder="Justificativa obrigatoria"
                        style={inputStyle}
                      />
                      <input
                        name="confirmation"
                        required
                        placeholder="Digite CONFIRMAR"
                        style={inputStyle}
                      />
                      <input
                        name="amount"
                        inputMode="decimal"
                        placeholder="Valor parcial (vazio = total)"
                        style={inputStyle}
                      />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button
                          name="action"
                          value="RECONCILE"
                          style={buttonStyle}
                        >
                          Conciliar
                        </button>
                        {payment.status === "PENDING" ? (
                          <button
                            name="action"
                            value="CANCEL"
                            style={dangerButtonStyle}
                          >
                            Cancelar
                          </button>
                        ) : null}
                        {["PAID", "PARTIALLY_REFUNDED"].includes(payment.status) ? (
                          <button
                            name="action"
                            value="REFUND"
                            style={dangerButtonStyle}
                          >
                            Reembolsar
                          </button>
                        ) : null}
                      </div>
                      <input
                        type="hidden"
                        name="idempotencyKey"
                        value={`${payment.id}:${payment.updatedAt.getTime()}`}
                      />
                    </form>
                  ) : "Sem cobranca vinculada"}
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
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 8,
  background: "#050506",
  color: "#fff",
  padding: 8,
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: "1px solid rgba(239,68,68,.4)",
  background: "rgba(239,68,68,.12)",
  color: "#fca5a5",
};
