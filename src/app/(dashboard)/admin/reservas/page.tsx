import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { getAsaasPayment, isAsaasPaidStatus } from "@/lib/asaas";
import { logAudit } from "@/lib/audit";
import { bookingPayoutBlockers, canEnableLivePayout } from "@/lib/booking-policy";
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

async function updateBookingFinance(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("finance:adjust");
  const bookingId = String(formData.get("bookingId") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  const confirmation = String(formData.get("confirmation") || "").trim();
  const payoutReference = String(formData.get("payoutReference") || "").trim();
  if (!bookingId || reason.length < 8 || confirmation !== "CONFIRMAR") return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 1 } },
  });
  if (!booking) return;

  if (action === "CONFIRM_CHECK_IN") {
    const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
    const delayHours = settings?.bookingPayoutDelayHours ?? 24;
    const payoutEligibleAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          checkInStatus: "CONFIRMED",
          payoutEligibleAt,
          payoutBlocked: true,
          payoutBlockedReason: "Check-in confirmado; aguardando prazo, aprovacoes, homologacao e ausencia de impedimentos.",
        },
      }),
      prisma.bookingFinancialEvent.create({
        data: {
          bookingId: booking.id,
          paymentId: booking.payments[0]?.id,
          type: "CHECK_IN_CONFIRMED",
          status: "PAYOUT_STILL_BLOCKED",
          reason,
          metadata: { payoutEligibleAt: payoutEligibleAt.toISOString(), delayHours },
        },
      }),
    ]);
  } else if (action === "OPEN_DISPUTE" || action === "NO_SHOW") {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          disputeStatus: action === "NO_SHOW" ? "NO_SHOW_REVIEW" : "OPEN",
          payoutStatus: "HOLD",
          payoutBlocked: true,
          payoutBlockedReason: reason,
        },
      }),
      prisma.bookingFinancialEvent.create({
        data: {
          bookingId: booking.id,
          paymentId: booking.payments[0]?.id,
          type: action === "NO_SHOW" ? "NO_SHOW_REPORTED" : "DISPUTE_OPENED",
          status: "UNDER_REVIEW",
          reason,
        },
      }),
    ]);
  } else if (action === "RESOLVE_DISPUTE") {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          disputeStatus: "RESOLVED",
          payoutStatus: "NOT_SCHEDULED",
          payoutBlocked: true,
          payoutBlockedReason: "Impedimento resolvido, mas o repasse live permanece sujeito as aprovacoes e homologacoes globais.",
        },
      }),
      prisma.bookingFinancialEvent.create({
        data: {
          bookingId: booking.id,
          paymentId: booking.payments[0]?.id,
          type: "DISPUTE_RESOLVED",
          status: "COMPLETED",
          reason,
        },
      }),
    ]);
  } else if (action === "PAYOUT_RECONCILE") {
    const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
    if (!settings || !settings.bookingLivePayoutEnabled || !canEnableLivePayout(settings)) {
      throw new Error(`Repasse bloqueado: ${bookingPayoutBlockers(settings ?? {
        bookingCommercialModelApproved: false,
        bookingCancellationPolicyApproved: false,
        bookingPayoutIntegrationHomologated: false,
        bookingFinancialTestsApproved: false,
      }).join(", ") || "chave mestre desativada"}.`);
    }
    const payment = booking.payments[0];
    if (settings.bookingPayoutReleaseEvent === "CHECK_IN_CONFIRMED" && booking.checkInStatus !== "CONFIRMED") {
      throw new Error("O check-in ainda nao foi confirmado.");
    }
    if (booking.payoutEligibleAt && booking.payoutEligibleAt > new Date()) {
      throw new Error("O prazo configurado para elegibilidade do repasse ainda nao terminou.");
    }
    if (!payment?.providerPaymentId || !payoutReference) return;
    const remote = await getAsaasPayment(payment.providerPaymentId);
    if (!isAsaasPaidStatus(remote.status)) {
      throw new Error("O Asaas nao confirma o pagamento da reserva.");
    }
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          payoutStatus: "PAID",
          payoutDate: new Date(),
          payoutBlocked: false,
          payoutBlockedReason: null,
        },
      }),
      prisma.bookingFinancialEvent.create({
        data: {
          bookingId: booking.id,
          paymentId: payment.id,
          type: "PAYOUT_RECONCILED",
          status: "COMPLETED",
          payoutCents: booking.hostPayoutCents,
          reason,
          metadata: { payoutReference, providerPaymentStatus: remote.status },
        },
      }),
    ]);
  } else {
    return;
  }

  await logAudit({
    adminId: session.user.id,
    action: "PAYMENT_PROCESSED",
    targetType: "PAYMENT",
    targetId: booking.payments[0]?.id ?? booking.id,
    reason,
    changes: { bookingId, action, payoutReference: payoutReference || null },
  });
  revalidatePath("/admin/reservas");
}

function tone(status: string) {
  if (["PAID", "CONFIRMED", "COMPLETED"].includes(status)) return "success" as const;
  if (["CANCELLED", "REJECTED", "FAILED", "CHARGEBACK"].includes(status)) return "danger" as const;
  return "warning" as const;
}

export default async function AdminReservasPage() {
  await requireAdmin("finance:view");
  const [bookings, pendingPayout, openDisputes, bookingSettings] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        property: { select: { title: true, host: { select: { name: true, email: true } } } },
        guest: { select: { name: true, email: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        financialEvents: { orderBy: { createdAt: "desc" }, take: 4 },
      },
    }),
    prisma.booking.aggregate({
      where: { paymentStatus: "PAID", payoutStatus: { not: "PAID" } },
      _sum: { hostPayoutCents: true },
      _count: true,
    }),
    prisma.booking.count({ where: { disputeStatus: { not: "NONE" } } }),
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
  ]);
  const livePayoutAvailable = Boolean(
    bookingSettings?.bookingLivePayoutEnabled
    && canEnableLivePayout(bookingSettings),
  );

  return (
    <div>
      <AdminHeader
        title="Reservas"
        subtitle="Proposta financeira pendente de aprovacao dos socios e da advogada. Repasse live permanece bloqueado."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard label="Reservas exibidas" value={bookings.length} />
        <StatCard label="Repasses pendentes" value={pendingPayout._count} tone="warning" />
        <StatCard
          label="Valor liquido pendente"
          value={`R$ ${((pendingPayout._sum.hostPayoutCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
        <StatCard label="Disputas abertas" value={openDisputes} tone={openDisputes ? "danger" : "neutral"} />
      </div>
      <AdminPanel>
        <p style={{ color: livePayoutAvailable ? "#22c55e" : "#f59e0b", marginTop: 0 }}>
          {livePayoutAvailable
            ? "Repasse habilitado pelas configuracoes e aprovacoes registradas."
            : `Repasse bloqueado. Pendencias: ${bookingPayoutBlockers(bookingSettings ?? {
              bookingCommercialModelApproved: false,
              bookingCancellationPolicyApproved: false,
              bookingPayoutIntegrationHomologated: false,
              bookingFinancialTestsApproved: false,
            }).join(", ") || "chave mestre desativada"}.`}
        </p>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Reserva</th>
              <th style={thStyle}>Partes</th>
              <th style={thStyle}>Financeiro</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Aceite</th>
              <th style={thStyle}>Trilha recente</th>
              <th style={thStyle}>Controle</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td style={tdStyle}>
                  <strong>{booking.property.title}</strong><br />
                  {booking.checkIn.toLocaleDateString("pt-BR")} a {booking.checkOut.toLocaleDateString("pt-BR")}<br />
                  <small>{booking.id}</small>
                </td>
                <td style={tdStyle}>
                  Cliente: {booking.guest.name || booking.guest.email}<br />
                  Anfitriao: {booking.property.host.name || booking.property.host.email}
                </td>
                <td style={tdStyle}>
                  Total: R$ {((booking.totalPriceCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<br />
                  Taxa: R$ {((booking.serviceFeeCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<br />
                  Liquido: R$ {((booking.hostPayoutCents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={tone(booking.status)}>{booking.status}</StatusPill><br />
                  <StatusPill tone={tone(booking.paymentStatus)}>{booking.paymentStatus}</StatusPill><br />
                  <small>Check-in: {booking.checkInStatus}<br />Repasse: {booking.payoutStatus} / Disputa: {booking.disputeStatus}</small>
                  {booking.payoutBlockedReason ? <><br /><small>Bloqueio: {booking.payoutBlockedReason}</small></> : null}
                </td>
                <td style={tdStyle}>
                  {booking.acceptedAt?.toLocaleString("pt-BR") ?? "Legado sem snapshot"}<br />
                  <small>{booking.termsVersionId ?? "-"}</small>
                </td>
                <td style={tdStyle}>
                  {booking.financialEvents.length
                    ? booking.financialEvents.map((event) => (
                        <div key={event.id} style={{ marginBottom: 5 }}>
                          <strong>{event.type}</strong> / {event.status}<br />
                          <small>{event.createdAt.toLocaleString("pt-BR")}</small>
                        </div>
                      ))
                    : "Sem eventos"}
                </td>
                <td style={tdStyle}>
                  <form action={updateBookingFinance} style={{ display: "grid", gap: 7, minWidth: 220 }}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input name="reason" required minLength={8} placeholder="Justificativa obrigatoria" style={inputStyle} />
                    <input name="confirmation" required placeholder="Digite CONFIRMAR" style={inputStyle} />
                    <input name="payoutReference" placeholder="Referencia do repasse" style={inputStyle} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button name="action" value="OPEN_DISPUTE" style={buttonStyle}>Disputa</button>
                      <button name="action" value="NO_SHOW" style={buttonStyle}>No-show</button>
                      {booking.checkInStatus !== "CONFIRMED" ? (
                        <button name="action" value="CONFIRM_CHECK_IN" style={buttonStyle}>Confirmar check-in</button>
                      ) : null}
                      {booking.disputeStatus !== "NONE" && booking.disputeStatus !== "RESOLVED" ? (
                        <button name="action" value="RESOLVE_DISPUTE" style={buttonStyle}>Resolver</button>
                      ) : null}
                      {livePayoutAvailable && booking.paymentStatus === "PAID" && booking.payoutStatus !== "PAID" && ["NONE", "RESOLVED"].includes(booking.disputeStatus) ? (
                        <button name="action" value="PAYOUT_RECONCILE" style={buttonStyle}>Conciliar repasse</button>
                      ) : null}
                    </div>
                  </form>
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
