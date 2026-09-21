import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  digitVendorDataBelongsToUser,
  digitWebhookTargetsActiveSession,
  digitWebhookAuditPayload,
  verifyDigitWebhook,
  fetchDigitSessionDecision,
  extractDateOfBirth,
  isAdult,
  DIDIT_APPROVED_STATUS,
  DIDIT_PENDING_STATUS,
  DIDIT_REJECTED_STATUS,
  DiditWebhookPayload,
} from "@/lib/didit";
import { claimWebhookEvent, markWebhookEventDone, markWebhookEventFailed } from "@/lib/webhook-idempotency";

const REJECTED_MESSAGE = "Verificacao nao aprovada pelo sistema de identidade Didit.";
const PENDING_DIDIT_STATUSES = new Set(["Not Started", "In Progress", "In Review", "Resubmitted", "Awaiting User", "Not Finished"]);
const REJECTED_DIDIT_STATUSES = new Set(["Declined", "Abandoned", "Expired", "Kyc Expired", "Cancelled"]);

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

  const eventId = payload.event_id || `didit:${sessionId}:${eventType}:${status}`;
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

    if ((eventType === "status.updated" || eventType === "data.updated") && status === "Approved") {
      let dateOfBirth: string | null = null;
      let ageVerified = false;

      try {
        const decision = await fetchDigitSessionDecision(sessionId);
        if (!digitVendorDataBelongsToUser(decision.vendor_data, userId)) {
          throw new Error("didit_session_owner_mismatch");
        }
        dateOfBirth = extractDateOfBirth(decision);
        ageVerified = isAdult(dateOfBirth);
      } catch (err) {
        console.error("[didit-webhook] falha ao buscar decisao, assumindo nao verificado.", {
          sessionId,
          reason: err instanceof Error ? err.name : "unknown",
        });
        throw new Error("didit_decision_unavailable");
      }

      if (!ageVerified) {
        const reason = dateOfBirth
          ? "Verificacao recusada: usuario nao tem 18 anos completos."
          : "Verificacao recusada: data de nascimento nao encontrada no documento.";
        await updateRecords(userId, sessionId, DIDIT_REJECTED_STATUS, reason);
      } else {
        await updateRecords(userId, sessionId, DIDIT_APPROVED_STATUS, null);
      }
    } else if ((eventType === "status.updated" || eventType === "data.updated") && status && REJECTED_DIDIT_STATUSES.has(status)) {
      await updateRecords(userId, sessionId, DIDIT_REJECTED_STATUS, REJECTED_MESSAGE);
    } else if ((eventType === "status.updated" || eventType === "data.updated") && (!status || PENDING_DIDIT_STATUSES.has(status))) {
      await updatePendingRecords(userId, sessionId, status ?? "");
    } else {
      await markWebhookEventDone("didit", eventId, "IGNORED");
      return NextResponse.json({ received: true });
    }

    await markWebhookEventDone("didit", eventId);
    return NextResponse.json({ received: true });
  } catch (err) {
    await markWebhookEventFailed("didit", eventId, err).catch(() => undefined);
    console.error("[didit-webhook] falha ao processar evento", {
      eventId,
      sessionId,
      reason: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}

async function updateRecords(
  userId: string,
  sessionId: string,
  kycStatus: string,
  rejectReason: string | null,
) {
  const isApproved = kycStatus === DIDIT_APPROVED_STATUS;
  const isRejected = kycStatus === DIDIT_REJECTED_STATUS;
  const verifStatus = isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING";
  const docStatus = isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING";
  const userStatus = isApproved ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING_REVIEW";

  await Promise.all([
    prisma.user.updateMany({
      where: { id: userId, kycSessionId: sessionId },
      data: {
        clientStatus: userStatus,
        kycReviewedAt: new Date(),
        kycRejectionReason: isRejected ? rejectReason : null,
      },
    }),
    prisma.professional.updateMany({
      where: { userId, kycProvider: "DIDIT", kycSessionId: sessionId },
      data: {
        kycProvider: "DIDIT",
        kycStatus,
        docStatus,
        verifStatus,
        rejectReason: isRejected ? rejectReason : null,
        verificationUrl: isApproved || isRejected ? null : undefined,
      },
    }),
  ]);
}

async function updatePendingRecords(
  userId: string,
  sessionId: string,
  diditStatus: string,
) {
  await Promise.all([
    prisma.user.updateMany({
      where: { id: userId, kycSessionId: sessionId },
      data: {
        clientStatus: "PENDING_REVIEW",
        kycSubmittedAt: new Date(),
      },
    }),
    prisma.professional.updateMany({
      where: { userId, kycProvider: "DIDIT", kycSessionId: sessionId },
      data: {
        kycProvider: "DIDIT",
        kycStatus: DIDIT_PENDING_STATUS,
        docStatus: "PENDING",
        verifStatus: "PENDING",
        rejectReason: diditStatus ? `Didit status: ${diditStatus}` : null,
      },
    }),
  ]);
}
