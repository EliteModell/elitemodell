import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  digitWebhookTargetsActiveSession,
  digitWebhookAuditPayload,
  verifyDigitWebhook,
  DiditWebhookPayload,
} from "@/lib/didit";
import { claimWebhookEvent, markWebhookEventDone, markWebhookEventFailed } from "@/lib/webhook-idempotency";

import { reconcileProfessionalDidit } from "@/lib/didit-reconciliation";

export async function handleDigitWebhook(req: NextRequest) {
  const rawBody = await req.text();
  const signatureV2 = req.headers.get("x-signature-v2");
  const signature = req.headers.get("x-signature");
  const signatureSimple = req.headers.get("x-signature-simple");
  const timestampHeader = req.headers.get("x-timestamp") ?? "";
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim() ?? "";

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "DIDIT_WEBHOOK_SECRET obrigatorio em producao." }, { status: 500 });
  }

  if (secret) {
    const ts = parseInt(timestampHeader, 10);
    if (!isNaN(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
      return NextResponse.json({ error: "Timestamp expirado." }, { status: 400 });
    }

    const valid = verifyDigitWebhook({ rawBody, parsedBody: payload, secret, signatureV2, signature, signatureSimple });
    if (!valid) {
      console.error("[didit-webhook] Assinatura invalida.", {
        hasV2: Boolean(signatureV2),
        hasRaw: Boolean(signature),
        hasSimple: Boolean(signatureSimple),
      });
      return NextResponse.json({ error: "Assinatura invalida." }, { status: 400 });
    }
  }

  const eventType = payload.webhook_type;
  const sessionId = payload.session_id;
  const status = payload.status;
  const vendorData = payload.vendor_data;

  if (!sessionId) {
    return NextResponse.json({ received: true });
  }

  const eventId = payload.event_id || `didit:${sessionId}:${eventType}:${status}:${payload.created_at ?? payload.timestamp}`;
  const claim = await claimWebhookEvent({
    provider: "didit",
    eventId,
    eventType: eventType ?? null,
    resourceId: sessionId,
    payload: digitWebhookAuditPayload(payload),
  });

  if (!claim.claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const activeProfessional = await prisma.professional.findFirst({
      where: { kycProvider: "DIDIT", kycSessionId: sessionId },
      select: { userId: true },
    });
    if (!activeProfessional || !digitWebhookTargetsActiveSession({
      activeSessionId: sessionId,
      webhookSessionId: sessionId,
      vendorData,
      userId: activeProfessional.userId,
    })) {
      await markWebhookEventDone("didit", eventId, "IGNORED");
      return NextResponse.json({ received: true, stale: true });
    }
    const userId = activeProfessional.userId;

    if (eventType !== "status.updated" && eventType !== "data.updated") {
      await markWebhookEventDone("didit", eventId, "IGNORED");
      return NextResponse.json({ received: true });
    }
    // Re-read the current decision under the account lock, including for pending/declined events.
    await reconcileProfessionalDidit(userId, sessionId);

    await markWebhookEventDone("didit", eventId);
    return NextResponse.json({ received: true });
  } catch (err) {
    await markWebhookEventFailed("didit", eventId, err).catch(() => undefined);
    console.error("[didit-webhook] falha ao processar evento", {
      eventId,
      sessionId,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}
