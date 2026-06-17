export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAdminRequest("reports:manage");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const asset = await prisma.uploadAsset.findUnique({
    where: { id },
    select: {
      originalName: true,
      detectedMimeType: true,
      quarantineBucket: true,
      quarantinePath: true,
      approvedBucket: true,
      approvedPath: true,
    },
  });
  if (!asset) return NextResponse.json({ error: "Ativo nao encontrado." }, { status: 404 });

  const bucket = asset.approvedBucket ?? asset.quarantineBucket;
  const path = asset.approvedPath ?? asset.quarantinePath;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }
  return new Response(data, {
    headers: {
      "Content-Type": asset.detectedMimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
