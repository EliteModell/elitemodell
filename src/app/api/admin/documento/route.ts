export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/security";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safePath(path: string) {
  return path.startsWith("asset:") ||
    (!path.includes("..") && !path.startsWith("/") && path.startsWith("documentos/"));
}

export async function GET(req: NextRequest) {
  const access = await authorizeAdminRequest("kyc:review");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path")?.trim() ?? "";
  const professionalId = searchParams.get("professionalId")?.trim() ?? "";
  if (!path || !professionalId || !safePath(path)) {
    return NextResponse.json({ error: "Caso KYC e caminho validos sao obrigatorios." }, { status: 400 });
  }

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      id: true,
      userId: true,
      docFrenteUrl: true,
      docVersoUrl: true,
      verificationUrl: true,
    },
  });
  const permittedPaths = new Set([
    professional?.docFrenteUrl,
    professional?.docVersoUrl,
    professional?.verificationUrl,
  ].filter((value): value is string => Boolean(value)));

  if (!professional || !permittedPaths.has(path)) {
    await logAudit({
      adminId: access.session.user.id,
      action: "ADMIN_ACCESS",
      targetType: "PROFESSIONAL",
      targetId: professionalId || "unknown",
      reason: "Tentativa negada de acesso a documento fora do caso KYC",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ error: "Documento nao pertence ao caso KYC informado." }, { status: 403 });
  }

  let documentUrl: string;
  if (path.startsWith("asset:")) {
    const assetId = path.slice("asset:".length);
    const asset = await prisma.uploadAsset.findUnique({
      where: { id: assetId },
      select: { userId: true, folder: true, status: true },
    });
    if (
      !asset ||
      asset.userId !== professional.userId ||
      asset.status !== "APPROVED" ||
      (!asset.folder.startsWith("documentos") && !asset.folder.startsWith("verificacao"))
    ) {
      return NextResponse.json({ error: "Documento em quarentena ou invalido." }, { status: 409 });
    }
    documentUrl = new URL(`/api/media/${assetId}`, req.url).toString();
  } else {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Nao foi possivel abrir o documento." }, { status: 500 });
    }
    documentUrl = data.signedUrl;
  }

  await logAudit({
    adminId: access.session.user.id,
    action: "ADMIN_ACCESS",
    targetType: "PROFESSIONAL",
    targetId: professional.id,
    reason: "Visualizacao de documento KYC por URL assinada",
    ipAddress: getClientIP(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ url: documentUrl, expiresIn: 60 });
}
