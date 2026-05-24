// Cria cobranca PIX via Asaas.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createAsaasCustomer,
  createAsaasPixPayment,
  getAsaasConfig,
  getAsaasPixQrCode,
} from "@/lib/asaas";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    bookingId: z.string().optional(),
    planId: z.enum(["elite-premium-monthly"]).optional(),
    creditAmount: z.number().positive().max(5000).optional(),
    description: z.string().min(1).optional(),
    payerName: z.string().optional(),
    payerCpf: z.string().optional(),
  })
  .refine((data) => [data.bookingId, data.planId, data.creditAmount].filter(Boolean).length === 1, {
    message: "Informe apenas uma finalidade: reserva, plano ou credito.",
  });

function nextDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function premiumUntilFromNow() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const asaas = getAsaasConfig();
  if (!asaas.configured) {
    return NextResponse.json({ error: "Asaas nao configurado. Defina ASAAS_API_KEY no ambiente." }, { status: 503 });
  }
  if (!asaas.productionReady) {
    return NextResponse.json(
      { error: "Asaas esta em sandbox no ambiente de producao. Ative ASAAS_ENVIRONMENT=production para cobrar valores reais." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true, document: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });

    let amount = 0;
    let description = data.description ?? "Pagamento Elite Modell";
    let bookingId: string | undefined;
    let creditAmount: number | undefined;
    let premiumUntil: Date | undefined;

    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { property: { select: { title: true } } },
      });

      if (!booking) return NextResponse.json({ error: "Reserva nao encontrada." }, { status: 404 });
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
      bookingId = booking.id;
      description = data.description ?? `Reserva ${booking.property.title}`;
    } else if (data.creditAmount) {
      amount = data.creditAmount;
      creditAmount = data.creditAmount;
      description = data.description ?? `Creditos Elite Modell - R$ ${data.creditAmount.toFixed(2)}`;
    } else if (data.planId) {
      amount = 49.9;
      premiumUntil = premiumUntilFromNow();
      description = data.description ?? "Elite Premium mensal";
    }

    if (amount <= 0) return NextResponse.json({ error: "Valor invalido." }, { status: 400 });

    const localPayment = await prisma.payment.create({
      data: {
        bookingId,
        userId: user.id,
        amount,
        method: "pix",
        provider: "asaas",
        status: "PENDING",
        externalReference: `asaas-${user.id}-${Date.now()}`,
        creditAmount,
        premiumUntil,
      },
    });

    const customer = await createAsaasCustomer({
      name: data.payerName?.trim() || user.name || "Cliente Elite Modell",
      email: user.email,
      cpfCnpj: data.payerCpf || user.document,
      phone: user.phone,
    });

    const asaasPayment = await createAsaasPixPayment({
      customer: customer.id,
      value: Number(amount.toFixed(2)),
      dueDate: nextDueDate(),
      description,
      externalReference: localPayment.externalReference ?? localPayment.id,
    });

    const pix = await getAsaasPixQrCode(asaasPayment.id);

    await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        providerPaymentId: asaasPayment.id,
        stripePaymentId: asaasPayment.id,
        pixCode: pix.payload ?? null,
        pixQrCodeBase64: pix.encodedImage ?? null,
        invoiceUrl: asaasPayment.invoiceUrl ?? null,
        boletoUrl: asaasPayment.bankSlipUrl ?? null,
      },
    });

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentId: asaasPayment.id, paymentMethod: "pix" },
      });
    }

    return NextResponse.json({
      paymentId: asaasPayment.id,
      localPaymentId: localPayment.id,
      provider: "asaas",
      environment: asaas.environment,
      status: asaasPayment.status ?? "PENDING",
      qrCode: pix.payload ?? null,
      qrCodeBase64: pix.encodedImage ?? null,
      copyPaste: pix.payload ?? null,
      ticketUrl: asaasPayment.invoiceUrl ?? null,
      expiresAt: pix.expirationDate ?? null,
      amount,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[asaas-pix]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao criar cobranca PIX no Asaas." }, { status: 500 });
  }
}
