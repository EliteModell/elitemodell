export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function createLocalSession(userId: string) {
  const id = `local_kyc_${userId}_${Date.now()}`;
  const challenges = [
    "Vire o rosto para a esquerda e pisque duas vezes",
    "Vire o rosto para a direita e sorria",
    "Aproxime o documento do rosto por tres segundos",
    "Leia o código em voz alta e pisque uma vez",
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];

  return {
    provider: "LOCAL_MANUAL",
    sessionId: id,
    status: "MANUAL_REVIEW",
    url: "",
    challenge,
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    captureMode: "CAMERA_OR_UPLOAD",
    message: "Sessão local criada. Capture selfie ou vídeo com o desafio para análise manual.",
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar biometria." }, { status: 403 });
  }

  const provider = process.env.KYC_PROVIDER?.trim();

  if (!provider || provider === "LOCAL_MANUAL") {
    return NextResponse.json(createLocalSession(session.user.id));
  }

  return NextResponse.json(
    {
      error: `Provedor KYC '${provider}' ainda não foi configurado no backend.`,
      expectedEnv: ["KYC_PROVIDER", "KYC_API_KEY", "KYC_WEBHOOK_SECRET"],
    },
    { status: 501 }
  );
}
