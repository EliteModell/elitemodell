// Pagamento com cartão de crédito via Asaas.
// Dados do cartão transitam apenas por HTTPS — nunca são persistidos.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createAsaasCardPayment, createAsaasCustomer, getAsaasConfig } from "@/lib/asaas";
import { applyPaidPaymentEffects } from "@/lib/payment-effects";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    bookingId: z.string().optional(),
    planId: z.enum(["elite-premium-monthly"]).optional(),
    creditAmount: z.number().positive().max(5000).optional(),
    description: z.string().optional(),
    card: z.object({
      holderName: z.string().min(2),
      number: z.string().min(15).max(19),
      expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
      expiryYear: z.string().regex(/^\d{2,4}$/),
      ccv: z.string().regex(/^\d{3,4}$/),
    }),
    holderInfo: z.object({
      cpfCnpj: z.string().min(11).max(14),
      postalCode: z.string().min(8).max(9),
      addressNumber: z.string().min(1),
      phone: z.string().optional(),
    }),
  })
  .refine(
    (d) => [d.bookingId, d.planId, d.creditAmount].filter(Boolean).length === 1,
    { message: "Informe apenas uma finalidade: reserva, plano ou credito." }
  );

function premiumUntilFromNow() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const asaas = getAsaasConfig();
  if (!asaas.configured) {
    return NextResponse.json({ error: "Asaas nao configurado. Defina ASAAS_API_KEY." }, { status: 503 });
  }
  if (!asaas.productionReady) {
    return NextResponse.json(
      { error: "Asaas esta em sandbox no ambiente de producao. Ative ASAAS_ENVIRONMENT=production para cobrar valores reais." },
      { status: 503 }
    );
  }

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, document: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });

  // Resolve finalidade e valor
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

  const remoteIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Cria registro local antes de chamar Asaas (rollback em caso de falha)
  const localPayment = await prisma.payment.create({
    data: {
      bookingId,
      userId: user.id,
      amount,
      method: "credit_card",
      provider: "asaas",
      status: "PENDING",
      externalReference: `asaas-card-${user.id}-${Date.now()}`,
      creditAmount,
      premiumUntil,
    },
  });

  try {
    const customer = await createAsaasCustomer({
      name: user.name || "Cliente Elite Modell",
      email: user.email,
      cpfCnpj: data.holderInfo.cpfCnpj || user.document,
      phone: data.holderInfo.phone || user.phone,
    });

    const cardNumber = data.card.number.replace(/[\s-]/g, "");
    const expiryYear =
      data.card.expiryYear.length === 2
        ? `20${data.card.expiryYear}`
        : data.card.expiryYear;

    const asaasPayment = await createAsaasCardPayment({
      customer: customer.id,
      value: Number(amount.toFixed(2)),
      dueDate: new Date().toISOString().slice(0, 10),
      description,
      externalReference: localPayment.externalReference ?? localPayment.id,
      creditCard: {
        holderName: data.card.holderName,
        number: cardNumber,
        expiryMonth: data.card.expiryMonth,
        expiryYear,
        ccv: data.card.ccv,
      },
      creditCardHolderInfo: {
        name: data.card.holderName,
        email: user.email ?? "",
        cpfCnpj: data.holderInfo.cpfCnpj.replace(/\D/g, ""),
        postalCode: data.holderInfo.postalCode.replace(/\D/g, ""),
        addressNumber: data.holderInfo.addressNumber,
        phone: (data.holderInfo.phone || user.phone)?.replace(/\D/g, "") ?? undefined,
      },
      remoteIp,
    });

    await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        providerPaymentId: asaasPayment.id,
        stripePaymentId: asaasPayment.id,
        invoiceUrl: asaasPayment.invoiceUrl ?? null,
      },
      select: { id: true },
    });

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentId: asaasPayment.id, paymentMethod: "credit_card" },
      });
    }

    // Cartão aprovado imediatamente — aplica efeitos sem esperar webhook
    if (asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED") {
      await applyPaidPaymentEffects(localPayment.id);
    }

    return NextResponse.json({
      paymentId: asaasPayment.id,
      localPaymentId: localPayment.id,
      provider: "asaas",
      status: asaasPayment.status ?? "PENDING",
      brand: asaasPayment.creditCardBrand ?? null,
      last4: asaasPayment.creditCardNumber?.slice(-4) ?? null,
      amount,
    });
  } catch (err) {
    await prisma.payment
      .update({ where: { id: localPayment.id }, data: { status: "FAILED" }, select: { id: true } })
      .catch(() => {});

    // Nunca logar dados do cartão — apenas mensagem de erro
    console.error("[asaas-card]", err instanceof Error ? err.message : "Erro desconhecido");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar cartao." },
      { status: 500 }
    );
  }
}
