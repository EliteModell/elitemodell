export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { ageGateCacheHeaders } from "@/lib/age-gate-policy";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { publicProfessionalWhere } from "@/lib/public-professional-access";

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "media";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const { id } = await context.params;
  const asset = await prisma.uploadAsset.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      originalName: true,
      folder: true,
      detectedMimeType: true,
      status: true,
      approvedBucket: true,
      approvedPath: true,
    },
  });
  if (
    !asset ||
    asset.status !== "APPROVED" ||
    !asset.approvedBucket ||
    !asset.approvedPath
  ) {
    return NextResponse.json(
      { error: "Midia indisponivel." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }

  const isOwner = asset.userId === session?.user?.id;
  const isPrivateIdentityMaterial =
    asset.folder.startsWith("documentos") ||
    asset.folder.startsWith("verificacao");
  if (isPrivateIdentityMaterial && !session?.user?.id) {
    return NextResponse.json(
      { error: "Nao autorizado." },
      { status: 401, headers: ageGateCacheHeaders() },
    );
  }
  if (isPrivateIdentityMaterial && !isOwner) {
    const admin = await authorizeAdminRequest("kyc:review");
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: ageGateCacheHeaders() },
      );
    }
  } else if (!isOwner) {
    const controlledUrl = `/api/media/${asset.id}`;
    const now = new Date();
    const [profileReference, storyReference] = await Promise.all([
      prisma.professional.findFirst({
        where: {
          ...publicProfessionalWhere(now),
          userId: asset.userId,
          OR: [
            { image: controlledUrl },
            { galleryUrls: { has: controlledUrl } },
            { photos: { some: { url: controlledUrl } } },
            { user: { image: controlledUrl } },
            { presentationVideoUrl: controlledUrl, presentationVideoStatus: "APPROVED" },
          ],
        },
        select: { id: true },
      }),
      prisma.story.findFirst({
        where: {
          userId: asset.userId,
          expiresAt: { gt: now },
          OR: [{ mediaUrl: controlledUrl }, { thumbnail: controlledUrl }],
          user: {
            professional: {
              is: {
                ...publicProfessionalWhere(now),
                verified: true,
              },
            },
          },
        },
        select: { id: true },
      }),
    ]);
    if (!profileReference && !storyReference) {
      return NextResponse.json(
        { error: "Midia indisponivel." },
        { status: 404, headers: ageGateCacheHeaders() },
      );
    }
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(asset.approvedBucket)
    .download(asset.approvedPath);
  if (error || !data) {
    console.error("[media] arquivo aprovado ausente", {
      assetId: asset.id,
      error: error?.message,
    });
    return NextResponse.json(
      { error: "Midia indisponivel." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": asset.detectedMimeType,
      "Content-Disposition": `inline; filename="${safeFilename(asset.originalName)}"`,
      "Cache-Control": isPrivateIdentityMaterial || isOwner
        ? "private, no-store, max-age=0"
        : "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
