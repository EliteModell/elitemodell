// Webhook Mercado Pago — chamado quando o pagamento muda de status
// Atualiza booking/plan correspondente
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { mpPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mercado Pago envia: { type: "payment", data: { id: "..." } }
    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const payment = await mpPayment.get({ id: body.data.id });
    const status  = payment.status; // approved | pending | rejected | cancelled
    const externalRef = payment.external_reference;

    if (!externalRef) return NextResponse.json({ ok: true });

    // Map status MP → status interno
    const mapStatus: Record<string, "PAID" | "PENDING" | "FAILED" | "REFUNDED"> = {
      approved:    "PAID",
      pending:     "PENDING",
      in_process:  "PENDING",
      rejected:    "FAILED",
      cancelled:   "FAILED",
      refunded:    "REFUNDED",
    };
    const internalStatus = mapStatus[status ?? "pending"] ?? "PENDING";

    // Atualiza booking se existir
    const booking = await prisma.booking.findFirst({ where: { paymentId: String(payment.id) } });
    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: internalStatus,
          status: internalStatus === "PAID" ? "CONFIRMED" : booking.status,
        },
      });

      // Cria/atualiza registro de Payment
      await prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          amount:    Number(payment.transaction_amount ?? 0),
          method:    "pix",
          status:    internalStatus,
          stripePaymentId: String(payment.id),
          pixCode:   payment.point_of_interaction?.transaction_data?.qr_code ?? null,
          paidAt:    internalStatus === "PAID" ? new Date() : null,
        },
        update: {
          status: internalStatus,
          paidAt: internalStatus === "PAID" ? new Date() : null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
