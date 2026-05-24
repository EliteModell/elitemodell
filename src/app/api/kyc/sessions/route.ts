export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildPersonaUrl,
  createPersonaInquiry,
  getPersonaAvailability,
  getPersonaConfig,
  MANUAL_PENDING_STATUS,
  PersonaIntegrationError,
  PERSONA_PENDING_STATUS,
  PERSONA_FALLBACK_MESSAGE,
  shouldUsePersonaProvider,
} from "@/lib/persona";
import { prisma } from "@/lib/prisma";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function friendlyUnavailableResponse(reason: string, status = 503) {
  return NextResponse.json(
    {
      error: "Verificacao automatica indisponivel no momento. Use a verificacao manual.",
      code: "PERSONA_UNAVAILABLE",
      fallback: true,
      provider: "MANUAL",
      status: MANUAL_PENDING_STATUS,
      reason,
      message: PERSONA_FALLBACK_MESSAGE,
    },
    { status },
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar biometria." }, { status: 403 });
  }

  const availability = getPersonaAvailability();
  return NextResponse.json({
    provider: availability.configured ? "PERSONA" : "MANUAL",
    available: availability.configured,
    environment: availability.publicEnvironment ?? availability.environment,
    missing: availability.missing,
    templateInvalid: availability.templateInvalid,
    webhookConfigured: availability.webhookConfigured,
    message: availability.configured
      ? "Verificacao facial com Persona disponivel."
      : "Verificacao automatica indisponivel no momento. Use a verificacao manual.",
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar biometria." }, { status: 403 });
  }

  const personaConfig = getPersonaConfig();
  if (!shouldUsePersonaProvider()) {
    console.warn("[KYC] Persona indisponivel: variaveis ausentes.", {
      missing: personaConfig.missing,
      environment: personaConfig.environment,
    });
    return friendlyUnavailableResponse(personaConfig.missing.join(", "));
  }

  if (!personaConfig.templateId?.startsWith("itmpl_")) {
    console.error("[KYC] Persona template invalido.", {
      templatePrefix: personaConfig.templateId?.slice(0, 8),
      expectedPrefix: "itmpl_",
    });
    return friendlyUnavailableResponse("PERSONA_TEMPLATE_ID invalido.");
  }

  const redirectUri = `${appBaseUrl()}/verificacao/callback`;
  let inquiryId: string;
  let sessionToken: string | undefined;
  let oneTimeLink: string | undefined;

  try {
    ({ inquiryId, sessionToken, oneTimeLink } = await createPersonaInquiry(session.user.id, redirectUri));
  } catch (err) {
    if (err instanceof PersonaIntegrationError) {
      console.error("[KYC] Persona createInquiry falhou.", {
        code: err.code,
        status: err.status,
        message: err.message,
        details: err.details,
      });
      return friendlyUnavailableResponse(err.code, err.status && err.status >= 400 && err.status < 500 ? 503 : 502);
    }

    console.error("[KYC] Persona createInquiry falhou com erro inesperado:", err);
    return friendlyUnavailableResponse("PERSONA_UNKNOWN_ERROR", 502);
  }

  const url = oneTimeLink ?? buildPersonaUrl(inquiryId, sessionToken, redirectUri);

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        kycSessionId: inquiryId,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error("[KYC] Inquiry Persona criado, mas falhou ao salvar no usuario:", err);
  }

  return NextResponse.json({
    provider: "PERSONA",
    sessionId: inquiryId,
    inquiryId,
    status: PERSONA_PENDING_STATUS,
    url,
    captureMode: "PERSONA",
    message: "Verificacao facial com Persona iniciada.",
  });
}
