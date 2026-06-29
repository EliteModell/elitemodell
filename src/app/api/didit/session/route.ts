export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDigitSession, isDigitAvailable, DIDIT_PENDING_STATUS } from "@/lib/didit";
import { prisma } from "@/lib/prisma";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function canUseProfessionalKyc(session: {
  user: {
    role?: string | null;
    activeProfileType?: string | null;
    accountType?: string | null;
    isProfessional?: boolean | null;
  };
}) {
  return Boolean(
    session.user.role === "ADMIN" ||
      session.user.activeProfileType === "PROFESSIONAL" ||
      session.user.accountType === "model" ||
      session.user.accountType === "professional" ||
      session.user.isProfessional,
  );
}

export async function GET() {
  return NextResponse.json({
    available: isDigitAvailable(),
    provider: "DIDIT",
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (!canUseProfessionalKyc(session)) {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar verificacao." }, { status: 403 });
  }

  if (!isDigitAvailable()) {
    return NextResponse.json(
      { error: "Verificacao Didit nao configurada.", code: "DIDIT_UNAVAILABLE", available: false },
      { status: 503 },
    );
  }

  const callbackUrl = `${appBaseUrl()}/verificacao/callback`;

  let diditSession: Awaited<ReturnType<typeof createDigitSession>>;
  try {
    diditSession = await createDigitSession(session.user.id, callbackUrl);
  } catch (err) {
    console.error("[Didit] Falha ao criar sessao:", err);
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a verificacao de identidade. Tente novamente." },
      { status: 502 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          kycSessionId: diditSession.session_id,
          kycSubmittedAt: new Date(),
          kycRejectionReason: null,
        },
        select: { id: true },
      }),
      prisma.professional.updateMany({
        where: { userId: session.user.id },
        data: {
          kycProvider: "DIDIT",
          kycSessionId: diditSession.session_id,
          kycStatus: DIDIT_PENDING_STATUS,
          verifStatus: "PENDING",
          docStatus: "PENDING",
          rejectReason: null,
        },
      }),
    ]);
  } catch (err) {
    console.error("[Didit] Sessao criada mas falhou ao salvar no usuario:", err);
  }

  return NextResponse.json({
    provider: "DIDIT",
    sessionId: diditSession.session_id,
    url: diditSession.url,
    status: DIDIT_PENDING_STATUS,
    message: "Verificacao de identidade Didit iniciada.",
  });
}
