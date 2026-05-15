// Cria pagamento PIX via Mercado Pago
// Retorna QR Code e código copia-e-cola para o cliente pagar
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { mpPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  bookingId: z.string().optional(),
  planId:    z.string().optional(),
  description: z.string().min(1).optional(),
  payerName:  z.string().optional(),
  payerCpf:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Pagamentos não configurados. Contate o administrador." }, { status: 503 });
    }

    let amount = 0;
    let description = data.description ?? "Pagamento EliteModell";
    let externalReference = data.planId ?? `user-${session.user.id}`;

    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { property: { select: { title: true } } },
      });

      if (!booking) {
        return NextResponse.json({ error: "Reserva nao encontrada." }, { status: 404 });
      }
      if (booking.guestId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Acesso negado a esta reserva." }, { status: 403 });
      }
      if (booking.paymentStatus === "PAID") {
        return NextResponse.json({ error: "Reserva ja paga." }, { status: 409 });
      }
      if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
        return NextResponse.json({ error: "Reserva nao pode ser paga neste status." }, { status: 400 });
      }

      amount = booking.totalPrice;
      description = data.description ?? `Reserva ${booking.property.title}`;
      externalReference = booking.id;
    } else if (data.planId) {
      return NextResponse.json({ error: "Pagamento de planos ainda nao esta habilitado." }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Informe uma reserva para pagamento." }, { status: 400 });
    }

    const result = await mpPayment.create({
      body: {
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        payer: {
          email: session.user.email ?? "cliente@elitemodell.local",
          first_name: data.payerName?.split(" ")[0] ?? "Cliente",
          last_name:  data.payerName?.split(" ").slice(1).join(" ") || "EliteModell",
          identification: data.payerCpf ? { type: "CPF", number: data.payerCpf.replace(/\D/g, "") } : undefined,
        },
        external_reference: externalReference,
        notification_url: `${process.env.NEXTAUTH_URL ?? ""}/api/payments/webhook`,
      },
      requestOptions: { idempotencyKey: `${session.user.id}-${Date.now()}` },
    });

    // Salva referência do pagamento no booking se houver
    if (data.bookingId && result.id) {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { paymentId: String(result.id), paymentMethod: "pix" },
      });
    }

    return NextResponse.json({
      paymentId: result.id,
      status: result.status,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? null,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      copyPaste: result.point_of_interaction?.transaction_data?.qr_code ?? null,
      ticketUrl: result.point_of_interaction?.transaction_data?.ticket_url ?? null,
      expiresAt: result.date_of_expiration ?? null,
      amount,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[pix]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao criar pagamento PIX." }, { status: 500 });
  }
}
