// Handler compartilhado para webhooks Asaas.
// Usado por /api/payments/asaas/webhook (canônica) e /api/payments/webhook (legada).
// Configure APENAS /api/payments/asaas/webhook no painel Asaas > Configurações > Webhooks.

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAsaasConfig, getAsaasPayment, type AsaasPayment } from "@/lib/asaas";
import { syncAsaasPaymentSnapshot } from "@/lib/payment-operations";
import { prisma } from "@/lib/prisma";
import { claimWebhookEvent, markWebhookEventDone, markWebhookEventFailed } from "@/lib/webhook-idempotency";

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

export function validateWebhookToken(req: NextRequest) {
  const token = expectedWebhookToken();
  const production = process.env.NODE_ENV === "production";

  if (!token) {
    return production
      ? { ok: false as const, error: "ASAAS_WEBHOOK_TOKEN obrigatorio em producao." }
      : { ok: true as const };
  }

  const received = req.headers.get("asaas-access-token")?.trim();
  return received === token
    ? { ok: true as const }
    : { ok: false as const, error: "Webhook Asaas nao autorizado." };
}

function asaasEventId(payload: AsaasWebhookPayload, providerPaymentId: string) {
  return payload.id || `${payload.event ?? "PAYMENT_UPDATED"}:${providerPaymentId}:${payload.payment?.status ?? "UNKNOWN"}`;
}

export async function handleAsaasWebhook(req: NextRequest): Promise<NextResponse> {
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

  const eventId = asaasEventId(payload, providerPaymentId);
  const claim = await claimWebhookEvent({
    provider: "asaas",
    eventId,
    eventType: payload.event ?? null,
    resourceId: providerPaymentId,
    payload: {
      id: payload.id ?? null,
      event: payload.event ?? null,
      payment: {
        id: incomingPayment.id ?? null,
        status: incomingPayment.status ?? null,
        externalReference: incomingPayment.externalReference ?? null,
        value: incomingPayment.value ?? null,
      },
    } as Prisma.InputJsonObject,
  });
  if (!claim.claimed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const asaas = getAsaasConfig();
  let providerPayment: AsaasPayment = { ...incomingPayment, id: providerPaymentId };

  try {
    if (asaas.configured) {
      providerPayment = await getAsaasPayment(providerPaymentId);
    }

    const externalReference =
      providerPayment.externalReference ?? incomingPayment?.externalReference ?? null;

    const localPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId },
          { stripePaymentId: providerPaymentId },
          ...(externalReference ? [{ externalReference }] : []),
        ],
      },
    });

    if (!localPayment) {
      await markWebhookEventDone("asaas", eventId, "IGNORED");
      return NextResponse.json({ ok: true });
    }

    if (!asaas.configured && (payload.event === "PAYMENT_RECEIVED" || payload.event === "PAYMENT_CONFIRMED")) {
      providerPayment = { ...providerPayment, status: "CONFIRMED" };
    }
    await prisma.payment.update({
      where: { id: localPayment.id },
      data: { provider: "asaas", providerPaymentId, stripePaymentId: providerPaymentId },
    });
    await syncAsaasPaymentSnapshot(localPayment.id, providerPayment);

    await markWebhookEventDone("asaas", eventId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await markWebhookEventFailed("asaas", eventId, err).catch(() => undefined);
    console.error("[asaas-webhook] falha ao processar evento", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
