// Cria cobranca PIX via Asaas.
export const dynamic = "force-dynamic";

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  AsaasApiError,
  createAsaasCustomer,
  createAsaasPixPayment,
  getAsaasConfig,
  getAsaasPixQrCode,
} from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";
import {
  CHECKOUT_LEGAL_KEYS,
  latestLegalDocumentVersions,
  recordUserAcceptances,
} from "@/lib/legal-acceptance";
import { getClientIP } from "@/lib/security";
import {
  CLIENT_PLAN_IDS,
  getClientPlan,
  premiumUntilFromDuration,
  resolveClientPlanPrice,
  type ClientPlanId,
} from "@/lib/client-plans";

const LEGACY_PLAN_IDS = ["elite-premium-monthly"] as const;
const ALL_PLAN_IDS = [...LEGACY_PLAN_IDS, ...CLIENT_PLAN_IDS] as [string, ...string[]];

const schema = z
  .object({
    bookingId: z.string().optional(),
    planId: z.enum(ALL_PLAN_IDS as [string, ...string[]]).optional(),
    creditAmount: z.number().positive().max(5000).optional(),
    description: z.string().min(1).optional(),
    payerName: z.string().optional(),
    payerCpf: z.string().optional(),
    checkoutToken: z.string().uuid(),
  })
  .refine((data) => [data.bookingId, data.planId, data.creditAmount].filter(Boolean).length === 1, {
    message: "Informe apenas uma finalidade: reserva, plano ou credito.",
  });

async function isFirstClientPremiumPurchase(userId: string): Promise<boolean> {
  const paid = await prisma.payment.findFirst({
    where: {
      userId,
      status: "PAID",
      premiumUntil: { not: null },
      creditAmount: null,
      bookingId: null,
      externalReference: { startsWith: "client-premium:" },
    },
    select: { id: true },
  });
  return paid === null;
}

function nextDueDate() {
  return new Date().toISOString().slice(0, 10);
}

function premiumUntilFromNow() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

function paymentPurpose(data: z.infer<typeof schema>) {
  if (data.bookingId) return "booking";
  if (data.creditAmount) return "credits";
  return "client-plan";
}

function clientSafePixError(err: unknown) {
  if (err instanceof AsaasApiError) {
    if (err.status === 400) {
      return `Nao foi possivel gerar o Pix: ${err.message}`;
    }
    if (err.status === 401 || err.status === 403) {
      return "Nao foi possivel gerar o Pix agora. Configuracao do provedor recusada.";
    }
    return "Nao foi possivel gerar o Pix no Asaas agora. Tente novamente em instantes.";
  }
  return "Nao foi possivel gerar o Pix agora. Tente novamente em instantes.";
}

function logPixError(err: unknown, context: Record<string, unknown>) {
  const technical =
    err instanceof AsaasApiError
      ? {
          name: err.name,
          message: err.message,
          status: err.status,
          path: err.path,
          details: err.details,
        }
      : err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err;

  console.error("[asaas-pix]", {
    ...context,
    error: technical,
  });
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
      if (data.planId === "elite-premium-monthly") {
        amount = 49.9;
        premiumUntil = premiumUntilFromNow();
        description = data.description ?? "Elite Premium mensal";
      } else {
        // client-premium-24h | client-premium-30d | client-premium-90d
        const clientPlan = getClientPlan(data.planId as ClientPlanId);
        const firstPurchase = await isFirstClientPremiumPurchase(user.id);
        amount = resolveClientPlanPrice(clientPlan, firstPurchase);
        premiumUntil = premiumUntilFromDuration(clientPlan.durationMs);
        description = data.description ?? `Elite Model Premium — ${clientPlan.durationLabel}`;
      }
    }

    if (amount <= 0) return NextResponse.json({ error: "Valor invalido." }, { status: 400 });

    const externalReference = data.bookingId
      ? `booking:${data.bookingId}:${data.checkoutToken}`
      : data.creditAmount
        ? `credits:${user.id}:${data.checkoutToken}`
        : `client-premium:${data.planId}:${user.id}:${data.checkoutToken}`;
    const existingPayment = await prisma.payment.findUnique({
      where: { externalReference },
    });
    if (
      existingPayment &&
      existingPayment.userId === user.id &&
      existingPayment.status === "PENDING" &&
      existingPayment.pixCode
    ) {
      return NextResponse.json({
        paymentId: existingPayment.providerPaymentId,
        localPaymentId: existingPayment.id,
        provider: existingPayment.provider,
        status: existingPayment.providerStatus ?? existingPayment.status,
        qrCode: existingPayment.pixCode,
        qrCodeBase64: existingPayment.pixQrCodeBase64,
        copyPaste: existingPayment.pixCode,
        ticketUrl: existingPayment.invoiceUrl,
        expiresAt: existingPayment.expiresAt?.toISOString() ?? null,
        amount: existingPayment.amount,
        reused: true,
      });
    }

    const localPayment = await prisma.payment.create({
      data: {
        bookingId,
        userId: user.id,
        amount,
        amountCents: toCents(amount),
        method: "pix",
        provider: "asaas",
        status: "PENDING",
        externalReference,
        creditAmount,
        premiumUntil,
      },
    });
    const legalVersions = await latestLegalDocumentVersions(CHECKOUT_LEGAL_KEYS);
    const checkoutVersion = legalVersions.get("checkout-notice") ?? legalVersions.get("payments-policy");
    const refundVersion = legalVersions.get("refund-policy");
    await recordUserAcceptances({
      userId: user.id,
      userCategory: session.user.accountType,
      documentKeys: CHECKOUT_LEGAL_KEYS,
      source: "payments-pix",
      acceptanceType: "CHECKOUT",
      req,
    });
    if (bookingId) {
      await prisma.checkoutAcceptance.updateMany({
        where: { productId: `booking:${bookingId}`, paymentId: null },
        data: { paymentId: localPayment.id },
      });
    } else {
      const disclosure = [
        paymentPurpose(data),
        data.planId ?? "credits",
        amount.toFixed(2),
        creditAmount ?? "",
        premiumUntil?.toISOString() ?? "",
        localPayment.externalReference ?? localPayment.id,
      ].join("|");
      await prisma.checkoutAcceptance.create({
        data: {
          userId: user.id,
          paymentId: localPayment.id,
          productId: data.planId ?? `credits:${localPayment.id}`,
          productName: description,
          totalPrice: amount,
          termsVersionId: checkoutVersion?.id ?? null,
          refundPolicyVersionId: refundVersion?.id ?? null,
          termsHash: checkoutVersion?.contentHash ?? createHash("sha256").update(`checkout:${disclosure}`).digest("hex"),
          refundPolicyHash: refundVersion?.contentHash ?? createHash("sha256").update(`refund:${disclosure}`).digest("hex"),
          ipAddress: getClientIP(req),
          userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
          sessionId: req.cookies.get("next-auth.session-token")?.value
            ? createHash("sha256").update(req.cookies.get("next-auth.session-token")!.value).digest("hex")
            : null,
          route: new URL(req.url).pathname,
          language: "pt-BR",
          acceptanceType: "CHECKOUT",
          required: true,
        },
      });
    }

    try {
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
      if (!pix.payload || !pix.encodedImage) {
        throw new Error("Asaas criou a cobranca, mas nao retornou QR Code Pix completo.");
      }

      await prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          providerPaymentId: asaasPayment.id,
          stripePaymentId: asaasPayment.id,
          pixCode: pix.payload,
          pixQrCodeBase64: pix.encodedImage,
          invoiceUrl: asaasPayment.invoiceUrl ?? null,
          boletoUrl: asaasPayment.bankSlipUrl ?? null,
          providerStatus: asaasPayment.status ?? "PENDING",
          providerUpdatedAt: new Date(),
          expiresAt: pix.expirationDate ? new Date(pix.expirationDate) : null,
        },
      });

      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentId: asaasPayment.id, paymentMethod: "pix" },
        });
      }

      console.info("[asaas-pix] Pix criado", {
        localPaymentId: localPayment.id,
        providerPaymentId: asaasPayment.id,
        userId: user.id,
        purpose: paymentPurpose(data),
        amount: Number(amount.toFixed(2)),
        environment: asaas.environment,
        hasQrCode: Boolean(pix.encodedImage),
        hasCopyPaste: Boolean(pix.payload),
      });

      return NextResponse.json({
        paymentId: asaasPayment.id,
        localPaymentId: localPayment.id,
        provider: "asaas",
        providerConfigured: true,
        environment: asaas.environment,
        status: asaasPayment.status ?? "PENDING",
        qrCode: pix.payload,
        qrCodeBase64: pix.encodedImage,
        copyPaste: pix.payload,
        ticketUrl: asaasPayment.invoiceUrl ?? null,
        expiresAt: pix.expirationDate ?? null,
        amount,
      });
    } catch (err) {
      await prisma.payment.update({
        where: { id: localPayment.id },
        data: { status: "FAILED" },
        select: { id: true },
      });
      logPixError(err, {
        localPaymentId: localPayment.id,
        userId: user.id,
        purpose: paymentPurpose(data),
        amount: Number(amount.toFixed(2)),
        environment: asaas.environment,
      });
      return NextResponse.json({ error: clientSafePixError(err) }, { status: 502 });
    }
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    logPixError(err, { userId: session.user.id, phase: "request" });
    return NextResponse.json({ error: "Erro ao iniciar geracao do Pix." }, { status: 500 });
  }
}
