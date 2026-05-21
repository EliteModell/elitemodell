import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPersonaWebhook } from "@/lib/persona";

export const dynamic = "force-dynamic";

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
          };
        };
      };
    };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("persona-signature") ?? "";
  const secret = process.env.PERSONA_WEBHOOK_SECRET ?? "";

  if (secret) {
    const valid = await verifyPersonaWebhook(rawBody, sig, secret);
    if (!valid) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
    }
  }

  let payload: PersonaEventPayload;
  try {
    payload = JSON.parse(rawBody) as PersonaEventPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const eventName = payload.data?.attributes?.name;
  const inquiryData = payload.data?.attributes?.payload?.data;
  const inquiryId = inquiryData?.id;
  const referenceId = inquiryData?.attributes?.["reference-id"];

  if (!inquiryId || !referenceId) {
    return NextResponse.json({ received: true });
  }

  if (eventName === "inquiry.approved") {
    await prisma.user.updateMany({
      where: { OR: [{ id: referenceId }, { kycSessionId: inquiryId }] },
      data: {
        clientStatus: "VERIFIED",
        kycReviewedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  } else if (eventName === "inquiry.declined" || eventName === "inquiry.failed") {
    await prisma.user.updateMany({
      where: { OR: [{ id: referenceId }, { kycSessionId: inquiryId }] },
      data: {
        clientStatus: "REJECTED",
        kycReviewedAt: new Date(),
        kycRejectionReason: "Verificação não aprovada pelo sistema de identidade.",
      },
    });
  }

  return NextResponse.json({ received: true });
}
