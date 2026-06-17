export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import {
  approveUploadAsset,
  processUploadAsset,
  rejectUploadAsset,
} from "@/lib/upload-quarantine";

const actionSchema = z.object({
  assetId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "REPROCESS"]),
  reason: z.string().trim().min(4).max(1000),
});

export async function GET(req: NextRequest) {
  const access = await authorizeAdminRequest("reports:manage");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const status = new URL(req.url).searchParams.get("status");
  const assets = await prisma.uploadAsset.findMany({
    where: status ? { status } : { status: { not: "APPROVED" } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      originalName: true,
      folder: true,
      category: true,
      detectedMimeType: true,
      sizeBytes: true,
      status: true,
      malwareStatus: true,
      moderationStatus: true,
      malwareProvider: true,
      moderationProvider: true,
      failureReason: true,
      scanAttempts: true,
      moderationAttempts: true,
      createdAt: true,
      lastProcessedAt: true,
    },
  });
  return NextResponse.json({ assets });
}

export async function PATCH(req: NextRequest) {
  const access = await authorizeAdminRequest("reports:manage");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const asset = parsed.data.action === "APPROVE"
      ? await approveUploadAsset(
          parsed.data.assetId,
          access.session.user.id,
          parsed.data.reason,
        )
      : parsed.data.action === "REJECT"
        ? await rejectUploadAsset(
            parsed.data.assetId,
            access.session.user.id,
            parsed.data.reason,
          )
        : await processUploadAsset(parsed.data.assetId);
    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        status: asset.status,
        malwareStatus: asset.malwareStatus,
        moderationStatus: asset.moderationStatus,
      },
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Falha ao processar ativo." },
      { status: 409 },
    );
  }
}
