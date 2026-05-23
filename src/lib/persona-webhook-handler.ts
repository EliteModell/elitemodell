import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERSONA_PENDING_STATUS, verifyPersonaWebhook } from "@/lib/persona";

type PersonaEventPayload = {
  data?: {
    attributes?: {
      name?: string;
      payload?: {
        data?: {
          id?: string;
          attributes?: {
            status?: string;
            "reference-id"?: string;
            "reviewer-comment"?: string;
            "decline-reason"?: string;
          };
        };
      };
    };
  };
};

const REJECTED_MESSAGE = "Verificacao nao aprovada pelo sistema de identidade.";
const PENDING_EVENTS = new Set([
  "inquiry.created",
  "inquiry.started",
  "inquiry.completed",
  "inquiry.marked-for-review",
  "inquiry.transitioned",
]);

export async function handlePersonaWebhook(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("persona-signature") ?? "";
  const secret = process.env.PERSONA_WEBHOOK_SECRET?.trim() ?? "";

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "PERSONA_WEBHOOK_SECRET obrigatorio em producao." }, { status: 500 });
  }

  if (secret) {
    const valid = await verifyPersonaWebhook(rawBody, sig, secret);
    if (!valid) {
      return NextResponse.json({ error: "Assinatura invalida." }, { status: 400 });
    }
  }

  let payload: PersonaEventPayload;
  try {
    payload = JSON.parse(rawBody) as PersonaEventPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const eventName = payload.data?.attributes?.name;
  const inquiryData = payload.data?.attributes?.payload?.data;
  const inquiryId = inquiryData?.id;
  const referenceId = inquiryData?.attributes?.["reference-id"];
  const inquiryStatus = inquiryData?.attributes?.status;
  const reviewerComment = inquiryData?.attributes?.["reviewer-comment"] || inquiryData?.attributes?.["decline-reason"];

  if (!inquiryId) {
    return NextResponse.json({ received: true });
  }

  if (eventName === "inquiry.approved") {
    await Promise.all([
      prisma.user.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ id: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          clientStatus: "VERIFIED",
          kycSessionId: inquiryId,
          kycReviewedAt: new Date(),
          kycRejectionReason: null,
        },
      }),
      prisma.professional.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ userId: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          kycProvider: "PERSONA",
          kycStatus: "APPROVED",
          verifStatus: "APPROVED",
          rejectReason: null,
        },
      }),
    ]);
  } else if (eventName === "inquiry.declined" || eventName === "inquiry.failed") {
    const reason = reviewerComment || REJECTED_MESSAGE;
    await Promise.all([
      prisma.user.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ id: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          clientStatus: "REJECTED",
          kycSessionId: inquiryId,
          kycReviewedAt: new Date(),
          kycRejectionReason: reason,
        },
      }),
      prisma.professional.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ userId: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          kycProvider: "PERSONA",
          kycStatus: "REJECTED",
          verifStatus: "REJECTED",
          rejectReason: reason,
        },
      }),
    ]);
  } else if (eventName && PENDING_EVENTS.has(eventName)) {
    await Promise.all([
      prisma.user.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ id: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          clientStatus: "PENDING_REVIEW",
          kycSessionId: inquiryId,
          kycSubmittedAt: new Date(),
          kycRejectionReason: null,
        },
      }),
      prisma.professional.updateMany({
        where: {
          OR: [
            ...(referenceId ? [{ userId: referenceId }] : []),
            { kycSessionId: inquiryId },
          ],
        },
        data: {
          kycProvider: "PERSONA",
          kycStatus: PERSONA_PENDING_STATUS,
          verifStatus: "PENDING",
          rejectReason: inquiryStatus ? `Persona status: ${inquiryStatus}` : null,
        },
      }),
    ]);
  }

  return NextResponse.json({ received: true });
}
