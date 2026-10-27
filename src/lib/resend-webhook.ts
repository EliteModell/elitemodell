import "server-only";

import { prisma } from "@/lib/prisma";
import { claimWebhookEvent, markWebhookEventDone, markWebhookEventFailed } from "@/lib/webhook-idempotency";
import { resendDeliveryUpdate, shouldApplyResendEvent, verifyResendWebhookSignature } from "@/lib/resend-webhook-security";

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string; message_id?: string };
};

export async function handleResendWebhook(request: Request) {
  const payload = await request.text();
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signature = request.headers.get("svix-signature") ?? "";
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret || !id || !timestamp || !signature || !verifyResendWebhookSignature({ payload, id, timestamp, signature, secret })) {
    return Response.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return Response.json({ error: "Payload invalido." }, { status: 400 });
  }
  const eventType = event.type ?? "unknown";
  const providerMessageId = event.data?.email_id ?? null;
  const parsedOccurredAt = new Date(event.created_at ?? Date.now());
  const occurredAt = Number.isNaN(parsedOccurredAt.getTime()) ? new Date() : parsedOccurredAt;
  const update = resendDeliveryUpdate(eventType, occurredAt);
  const claim = await claimWebhookEvent({
    provider: "RESEND",
    eventId: id,
    eventType,
    resourceId: providerMessageId,
    payload: { eventType, providerMessageId },
  });
  if (!claim.claimed) return Response.json({ ok: true, duplicate: true });

  try {
    if (!providerMessageId || !update) {
      await markWebhookEventDone("RESEND", id, "IGNORED");
      return Response.json({ ok: true, ignored: true });
    }
    const delivery = await prisma.emailDelivery.findUnique({ where: { providerMessageId }, select: { status: true, lastEventAt: true } });
    if (!delivery) {
      await markWebhookEventDone("RESEND", id, "IGNORED");
      return Response.json({ ok: true, ignored: true });
    }
    if (shouldApplyResendEvent(delivery, update)) {
      await prisma.emailDelivery.update({ where: { providerMessageId }, data: update });
    }
    await markWebhookEventDone("RESEND", id);
    return Response.json({ ok: true });
  } catch (error) {
    await markWebhookEventFailed("RESEND", id, error);
    return Response.json({ error: "Falha ao processar evento." }, { status: 500 });
  }
}
