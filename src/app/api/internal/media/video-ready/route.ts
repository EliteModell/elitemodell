export const dynamic = "force-dynamic";

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { processUploadAsset } from "@/lib/upload-quarantine";

const bodySchema = z.object({ assetId: z.string().min(8).max(64) });

function authorized(request: NextRequest) {
  const expected = process.env.VIDEO_WORKER_CALLBACK_SECRET?.trim();
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  const asset = await prisma.uploadAsset.findUnique({
    where: { id: parsed.data.assetId },
    include: { videoProcessingJob: true },
  });
  if (!asset?.videoProcessingJob || asset.videoProcessingJob.status !== "PROCESSING" || !asset.videoProcessingJob.outputPath) {
    return NextResponse.json({ error: "O vídeo ainda não foi preparado." }, { status: 409 });
  }
  if (asset.status === "APPROVED" || asset.status === "REJECTED") {
    return NextResponse.json({ ok: true, status: asset.status, duplicate: true });
  }
  const supabase = createSupabaseServerClient();
  const downloaded = await supabase.storage.from(asset.quarantineBucket).download(asset.quarantinePath);
  if (downloaded.error || !downloaded.data) return NextResponse.json({ error: "Versão otimizada indisponível." }, { status: 409 });
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  if (buffer.length !== asset.sizeBytes) return NextResponse.json({ error: "Versão otimizada incompleta." }, { status: 422 });
  const processed = await processUploadAsset(asset.id, buffer);
  return NextResponse.json({ ok: true, status: processed.status });
}
