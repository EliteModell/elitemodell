export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildPersonaUrl,
  createPersonaInquiry,
  getPersonaConfig,
  PERSONA_FALLBACK_MESSAGE,
} from "@/lib/persona";

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
    status: "KYC_MANUAL_PENDENTE",
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

  const provider = process.env.KYC_PROVIDER?.trim().toUpperCase();
  if (!provider || provider === "LOCAL_MANUAL" || provider === "MANUAL") {
    return NextResponse.json(createManualSession(session.user.id));
  }

  if (provider !== "PERSONA") {
    return NextResponse.json(createManualSession(session.user.id, `KYC_PROVIDER=${provider}`));
  }

  const personaConfig = getPersonaConfig();
  if (!personaConfig.configured) {
    return NextResponse.json(createManualSession(session.user.id, personaConfig.missing.join(", ")));
  }

  try {
    const redirectUri = `${appBaseUrl()}/verificacao/callback`;
    const { inquiryId, sessionToken, oneTimeLink } = await createPersonaInquiry(session.user.id, redirectUri);
    const url = oneTimeLink ?? buildPersonaUrl(inquiryId, sessionToken);

    return NextResponse.json({
      provider: "PERSONA",
      sessionId: inquiryId,
      inquiryId,
      status: "PENDING",
      url,
      captureMode: "PERSONA",
      message: "Sessao de biometria facial criada.",
    });
  } catch (err) {
    console.error("[KYC] Persona createInquiry falhou:", err);
    return NextResponse.json(createManualSession(session.user.id, "PERSONA_CREATE_INQUIRY_FAILED"));
  }
}
