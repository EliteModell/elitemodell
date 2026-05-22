// Webhook Asaas de cobrancas.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAsaasConfig, getAsaasPayment, isAsaasFailedStatus, isAsaasPaidStatus } from "@/lib/asaas";
import { prisma } from "@/lib/prisma";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string | null;
    value?: number;
    invoiceUrl?: string | null;
    bankSlipUrl?: string | null;
    pixTransaction?: string | null;
  };
};

function expectedWebhookToken() {
  return process.env.ASAAS_WEBHOOK_TOKEN?.trim() || process.env.ASAAS_WEBHOOK_AUTH_TOKEN?.trim();
}

function validateWebhookToken(req: NextRequest) {
  const token = expectedWebhookToken();
  const production = process.env.NODE_ENV === "production";

  if (!token) {
    return production
      ? { ok: false, error: "ASAAS_WEBHOOK_TOKEN obrigatorio em producao." }
      : { ok: true };
  }

  const received = req.headers.get("asaas-access-token")?.trim();
  return received === token ? { ok: true } : { ok: false, error: "Webhook Asaas nao autorizado." };
}

async function applyPaidEffects(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "PAID") return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      });
    }

    if (payment.userId && payment.creditAmount && payment.creditAmount > 0) {
      await tx.user.update({
        where: { id: payment.userId },
        data: { credits: { increment: payment.creditAmount } },
      });
    }

    if (payment.userId && payment.premiumUntil) {
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { premiumUntil: true },
      });
      const current = user?.premiumUntil?.getTime() ?? 0;
      const next = payment.premiumUntil.getTime();

      await tx.user.update({
        where: { id: payment.userId },
        data: { premiumUntil: new Date(Math.max(current, next)) },
      });
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = validateWebhookToken(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await req.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const incomingPayment = payload.payment;
  const providerPaymentId = incomingPayment?.id;

  if (!providerPaymentId) return NextResponse.json({ ok: true });

  const asaas = getAsaasConfig();
  let providerPayment = incomingPayment;

  if (asaas.configured) {
    try {
      providerPayment = await getAsaasPayment(providerPaymentId);
    } catch (err) {
      console.error("[asaas-webhook] falha ao confirmar pagamento no Asaas", err);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  }

  const status = providerPayment.status;
  const externalReference = providerPayment.externalReference ?? incomingPayment?.externalReference ?? null;

  const localPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerPaymentId },
        { stripePaymentId: providerPaymentId },
        ...(externalReference ? [{ externalReference }] : []),
      ],
    },
  });

  if (!localPayment) return NextResponse.json({ ok: true });

  await prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      provider: "asaas",
      providerPaymentId,
      stripePaymentId: providerPaymentId,
      invoiceUrl: providerPayment.invoiceUrl ?? localPayment.invoiceUrl,
      boletoUrl: providerPayment.bankSlipUrl ?? localPayment.boletoUrl,
    },
  });

  if (isAsaasPaidStatus(status) || payload.event === "PAYMENT_RECEIVED" || payload.event === "PAYMENT_CONFIRMED") {
    await applyPaidEffects(localPayment.id);
  } else if (isAsaasFailedStatus(status) || payload.event === "PAYMENT_REFUNDED" || payload.event === "PAYMENT_DELETED") {
    await prisma.payment.update({
      where: { id: localPayment.id },
      data: { status: status === "REFUNDED" ? "REFUNDED" : "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
