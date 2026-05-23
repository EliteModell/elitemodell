export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildPersonaUrl,
  createPersonaInquiry,
  getPersonaConfig,
  MANUAL_PENDING_STATUS,
  PERSONA_PENDING_STATUS,
  PERSONA_FALLBACK_MESSAGE,
  shouldUsePersonaProvider,
} from "@/lib/persona";
import { prisma } from "@/lib/prisma";

function createManualSession(userId: string, reason?: string) {
  const id = `manual_kyc_${userId}_${Date.now()}`;
  const challenges = [
    "Vire o rosto para a esquerda e pisque duas vezes",
    "Vire o rosto para a direita e sorria",
    "Aproxime o documento do rosto por tres segundos",
    "Leia o codigo em voz alta e pisque uma vez",
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];

  return {
    provider: "MANUAL",
    sessionId: id,
    status: MANUAL_PENDING_STATUS,
    url: "",
    challenge,
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    captureMode: "CAMERA_OR_UPLOAD",
    fallback: true,
    reason,
    message: PERSONA_FALLBACK_MESSAGE,
  };
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar biometria." }, { status: 403 });
  }

  const personaConfig = getPersonaConfig();
  if (!shouldUsePersonaProvider()) {
    return NextResponse.json(createManualSession(session.user.id, personaConfig.missing.join(", ")));
  }

  if (!personaConfig.templateId?.startsWith("itmpl_")) {
    return NextResponse.json(
      { error: "PERSONA_TEMPLATE_ID deve ser um Inquiry Template da Persona e comecar com itmpl_." },
      { status: 503 },
    );
  }

  try {
    const redirectUri = `${appBaseUrl()}/verificacao/callback`;
    const { inquiryId, sessionToken, oneTimeLink } = await createPersonaInquiry(session.user.id, redirectUri);
    const url = oneTimeLink ?? buildPersonaUrl(inquiryId, sessionToken, redirectUri);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        kycSessionId: inquiryId,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
      select: { id: true },
    });

    return NextResponse.json({
      provider: "PERSONA",
      sessionId: inquiryId,
      inquiryId,
      status: PERSONA_PENDING_STATUS,
      url,
      captureMode: "PERSONA",
      message: "Verificacao facial com Persona iniciada.",
    });
  } catch (err) {
    console.error("[KYC] Persona createInquiry falhou:", err);
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a verificacao facial com Persona. Tente novamente ou contate o suporte." },
      { status: 502 },
    );
  }
}
