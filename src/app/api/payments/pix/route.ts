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
  amount:    z.number().positive(),
  description: z.string().min(1),
  payerEmail: z.string().email(),
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

    const result = await mpPayment.create({
      body: {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: "pix",
        payer: {
          email: data.payerEmail,
          first_name: data.payerName?.split(" ")[0] ?? "Cliente",
          last_name:  data.payerName?.split(" ").slice(1).join(" ") || "EliteModell",
          identification: data.payerCpf ? { type: "CPF", number: data.payerCpf.replace(/\D/g, "") } : undefined,
        },
        external_reference: data.bookingId ?? data.planId ?? `user-${session.user.id}`,
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
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[pix]", err?.message ?? err);
    return NextResponse.json({ error: "Erro ao criar pagamento PIX." }, { status: 500 });
  }
}
