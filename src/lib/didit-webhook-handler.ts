import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  verifyDigitWebhook,
  fetchDigitSessionDecision,
  extractDateOfBirth,
  isAdult,
  DIDIT_PENDING_STATUS,
  DiditWebhookPayload,
} from "@/lib/didit";
import { claimWebhookEvent, markWebhookEventDone, markWebhookEventFailed } from "@/lib/webhook-idempotency";

const REJECTED_MESSAGE = "Verificacao nao aprovada pelo sistema de identidade Didit.";

export async function handleDigitWebhook(req: NextRequest) {
  const rawBody = await req.text();
  const sig =
    req.headers.get("x-signature-v2") ??
    req.headers.get("x-signature") ??
    "";
  const timestampHeader = req.headers.get("x-timestamp") ?? "";
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim() ?? "";

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "DIDIT_WEBHOOK_SECRET obrigatorio em producao." }, { status: 500 });
  }

  if (secret) {
    const ts = parseInt(timestampHeader, 10);
    if (!isNaN(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
      return NextResponse.json({ error: "Timestamp expirado." }, { status: 400 });
    }

    const valid = await verifyDigitWebhook(rawBody, sig, secret);
    if (!valid) {
      console.error("[didit-webhook] Assinatura invalida.", { sig: sig.slice(0, 20) });
      return NextResponse.json({ error: "Assinatura invalida." }, { status: 400 });
    }
  }

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const eventType = payload.webhook_type;
  const sessionId = payload.session_id;
  const status = payload.status;
  const vendorData = payload.vendor_data;

  if (!sessionId) {
    return NextResponse.json({ received: true });
  }

  const eventId = payload.event_id || `didit:${sessionId}:${status}`;
  const claim = await claimWebhookEvent({
    provider: "didit",
    eventId,
    eventType: eventType ?? null,
    resourceId: sessionId,
    payload: payload as unknown as Prisma.InputJsonObject,
  });

  if (!claim.claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (eventType === "status.updated" && status === "Approved") {
      let dateOfBirth: string | null = null;
      let ageVerified = false;

      try {
        const decision = await fetchDigitSessionDecision(sessionId);
        dateOfBirth = extractDateOfBirth(decision);
        ageVerified = isAdult(dateOfBirth);
      } catch (err) {
        console.error("[didit-webhook] falha ao buscar decisao, assumindo nao verificado.", err);
      }

      if (!ageVerified) {
        const reason = dateOfBirth
          ? "Verificacao recusada: usuario nao tem 18 anos completos."
          : "Verificacao recusada: data de nascimento nao encontrada no documento.";
        await updateRecords(sessionId, vendorData, "REJECTED", reason);
      } else {
        await updateRecords(sessionId, vendorData, DIDIT_PENDING_STATUS, "Didit verificado; aguardando revisao admin.");
      }
    } else if (
      eventType === "status.updated" &&
      (status === "Declined" || status === "Abandoned" || status === "Expired" || status === "Kyc Expired")
    ) {
      await updateRecords(sessionId, vendorData, "REJECTED", REJECTED_MESSAGE);
    } else if (eventType === "status.updated") {
      await updatePendingRecords(sessionId, vendorData, status ?? "");
    } else {
      await markWebhookEventDone("didit", eventId, "IGNORED");
      return NextResponse.json({ received: true });
    }

    await markWebhookEventDone("didit", eventId);
    return NextResponse.json({ received: true });
  } catch (err) {
    await markWebhookEventFailed("didit", eventId, err).catch(() => undefined);
    console.error("[didit-webhook] falha ao processar evento", err);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}

async function updateRecords(
  sessionId: string,
  vendorData: string | null | undefined,
  kycStatus: string,
  rejectReason: string | null,
) {
  const isApproved = kycStatus === DIDIT_PENDING_STATUS;
  const verifStatus = isApproved ? "PENDING" : "REJECTED";
  const userStatus = isApproved ? "PENDING_REVIEW" : "REJECTED";

  await Promise.all([
    prisma.user.updateMany({
      where: {
        OR: [
          ...(vendorData ? [{ id: vendorData }] : []),
          { kycSessionId: sessionId },
        ],
      },
      data: {
        clientStatus: userStatus,
        kycSessionId: sessionId,
        kycReviewedAt: new Date(),
        kycRejectionReason: isApproved ? null : rejectReason,
      },
    }),
    prisma.professional.updateMany({
      where: {
        OR: [
          ...(vendorData ? [{ userId: vendorData }] : []),
          { kycSessionId: sessionId },
        ],
      },
      data: {
        kycProvider: "DIDIT",
        kycStatus,
        verifStatus,
        rejectReason,
      },
    }),
  ]);
}

async function updatePendingRecords(
  sessionId: string,
  vendorData: string | null | undefined,
  diditStatus: string,
) {
  await Promise.all([
    prisma.user.updateMany({
      where: {
        OR: [
          ...(vendorData ? [{ id: vendorData }] : []),
          { kycSessionId: sessionId },
        ],
      },
      data: {
        clientStatus: "PENDING_REVIEW",
        kycSessionId: sessionId,
        kycSubmittedAt: new Date(),
      },
    }),
    prisma.professional.updateMany({
      where: {
        OR: [
          ...(vendorData ? [{ userId: vendorData }] : []),
          { kycSessionId: sessionId },
        ],
      },
      data: {
        kycProvider: "DIDIT",
        kycStatus: "PENDING",
        verifStatus: "PENDING",
        rejectReason: `Didit status: ${diditStatus}`,
      },
    }),
  ]);
}
