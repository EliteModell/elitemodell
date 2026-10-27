export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PUBLIC_FIELDS = {
  id: true,
  status: true,
  malwareStatus: true,
  moderationStatus: true,
  controlledUrl: true,
  failureReason: true,
  lastProcessedAt: true,
} as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await context.params;
  const owned = await prisma.uploadAsset.findFirst({ where: { id, userId: session.user.id }, select: PUBLIC_FIELDS });
  if (!owned) return NextResponse.json({ error: "Upload não encontrado." }, { status: 404 });

  const displayState = owned.status === "APPROVED"
    ? "PUBLISHED"
    : owned.status === "REJECTED"
      ? "REJECTED"
      : owned.status === "PENDING_REVIEW"
        ? "REVIEW_REQUIRED"
        : "PROCESSING";
  const failureReason = displayState === "REJECTED"
    ? "A mídia não atende aos critérios de publicação. Você pode solicitar revisão ao suporte."
    : displayState === "REVIEW_REQUIRED"
      ? owned.failureReason || "A mídia continua privada e aguarda revisão de conteúdo pela equipe."
      : null;

  return NextResponse.json({
    assetId: owned.id,
    status: owned.status,
    malwareStatus: owned.malwareStatus,
    moderationStatus: owned.moderationStatus,
    url: owned.status === "APPROVED" ? owned.controlledUrl : null,
    displayState,
    pending: displayState === "PROCESSING",
    failureReason,
    lastProcessedAt: owned.lastProcessedAt,
  });
}
