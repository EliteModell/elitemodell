export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PHOTOS = 20;
const MAX_VIDEOS = 10;

const addSchema = z.object({
  assetId: z.string().min(1),
  kind: z.enum(["IMAGE", "VIDEO"]),
  caption: z.string().trim().max(180).nullable().optional(),
});

const updateSchema = z.object({
  order: z.array(z.string().min(1)).max(MAX_PHOTOS + MAX_VIDEOS).optional(),
  mediaId: z.string().min(1).optional(),
  role: z.enum(["GALLERY", "COVER"]).optional(),
  caption: z.string().trim().max(180).nullable().optional(),
}).refine((value) => Boolean(value.order || value.mediaId), "Informe a mídia ou a nova ordem.");

function displayState(asset: { status: string; moderationStatus: string; publicationDecisionType: string; adminReviewRequired: boolean; adminReviewStatus: string }) {
  if (asset.status === "APPROVED") return "PUBLISHED";
  if (asset.status === "REJECTED") return "REJECTED";
  if (asset.status === "PENDING_REVIEW" || (asset.adminReviewRequired && asset.adminReviewStatus === "PENDING")) return "REVIEW_REQUIRED";
  if (asset.moderationStatus === "APPROVED") return "PROCESSING";
  return "ANALYZING";
}

async function ownedProfessional(userId: string) {
  return prisma.professional.findUnique({ where: { userId }, select: { id: true, presentationVideoUrl: true, presentationVideoStatus: true } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const professional = await ownedProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });

  const media = await prisma.professionalMedia.findMany({
    where: { professionalId: professional.id, hiddenAt: null },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, kind: true, role: true, order: true, caption: true, legacyUrl: true, createdAt: true,
      asset: {
        select: {
          id: true, status: true, moderationStatus: true, publicationDecisionType: true, adminReviewRequired: true,
          adminReviewStatus: true, controlledUrl: true, detectedMimeType: true, failureReason: true,
        },
      },
    },
  });

  const items = media.map((item) => ({
    id: item.id,
    assetId: item.asset?.id ?? null,
    kind: item.kind,
    role: item.role,
    order: item.order,
    caption: item.caption,
    url: item.asset ? `/api/media/${encodeURIComponent(item.asset.id)}` : item.legacyUrl,
    mimeType: item.asset?.detectedMimeType ?? null,
    state: item.asset ? displayState(item.asset) : "PUBLISHED",
    publicationDecisionType: item.asset?.publicationDecisionType ?? "LEGACY",
    failureReason: item.asset?.status === "REJECTED" || item.asset?.status === "PENDING_REVIEW"
      ? item.asset.failureReason
      : null,
    createdAt: item.createdAt,
  }));

  // Compatibility: expose the old single video until it has been migrated.
  if (professional.presentationVideoUrl && !items.some((item) => item.url === professional.presentationVideoUrl)) {
    items.push({
      id: "legacy-presentation-video",
      assetId: null,
      kind: "VIDEO",
      role: "GALLERY",
      order: items.length,
      caption: null,
      url: professional.presentationVideoUrl,
      mimeType: null,
      state: professional.presentationVideoStatus === "APPROVED" ? "PUBLISHED" : professional.presentationVideoStatus === "REJECTED" ? "REJECTED" : "ANALYZING",
      publicationDecisionType: "LEGACY",
      failureReason: null,
      createdAt: new Date(0),
    });
  }

  return NextResponse.json({ items, limits: { photos: MAX_PHOTOS, videos: MAX_VIDEOS } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mídia inválida." }, { status: 400 });
  const professional = await ownedProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });

  const asset = await prisma.uploadAsset.findFirst({
    where: { id: parsed.data.assetId, userId: session.user.id },
    select: { id: true, category: true, folder: true, detectedMimeType: true },
  });
  const expectedCategory = parsed.data.kind === "VIDEO" ? "video" : "image";
  if (!asset || asset.category !== expectedCategory || !(asset.folder.startsWith("profiles") || asset.folder.startsWith("profile-videos"))) {
    return NextResponse.json({ error: "A mídia não pertence a este perfil." }, { status: 403 });
  }

  const limit = parsed.data.kind === "VIDEO" ? MAX_VIDEOS : MAX_PHOTOS;
  const count = await prisma.professionalMedia.count({ where: { professionalId: professional.id, kind: parsed.data.kind, hiddenAt: null } });
  if (count >= limit) return NextResponse.json({ error: `Limite de ${limit} arquivos atingido.` }, { status: 409 });

  const item = await prisma.professionalMedia.upsert({
    where: { assetId: asset.id },
    create: { professionalId: professional.id, assetId: asset.id, kind: parsed.data.kind, order: count, caption: parsed.data.caption ?? null },
    update: { hiddenAt: null, hiddenReason: null, caption: parsed.data.caption ?? undefined },
    select: { id: true, assetId: true, kind: true, role: true, order: true },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Atualização inválida." }, { status: 400 });
  const professional = await ownedProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (parsed.data.order) {
      const owned = await tx.professionalMedia.findMany({ where: { professionalId: professional.id, id: { in: parsed.data.order }, hiddenAt: null }, select: { id: true } });
      if (owned.length !== parsed.data.order.length) throw new Error("media_order_owner_mismatch");
      await Promise.all(parsed.data.order.map((id, order) => tx.professionalMedia.update({ where: { id }, data: { order } })));
    }
    if (parsed.data.mediaId) {
      const owned = await tx.professionalMedia.findFirst({ where: { id: parsed.data.mediaId, professionalId: professional.id, hiddenAt: null }, select: { id: true, kind: true } });
      if (!owned) throw new Error("media_owner_mismatch");
      if (parsed.data.role === "COVER" && owned.kind !== "IMAGE") throw new Error("video_cannot_be_cover");
      if (parsed.data.role === "COVER") await tx.professionalMedia.updateMany({ where: { professionalId: professional.id, role: "COVER" }, data: { role: "GALLERY" } });
      await tx.professionalMedia.update({ where: { id: owned.id }, data: { role: parsed.data.role, caption: parsed.data.caption } });
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id === "legacy-presentation-video") return NextResponse.json({ error: "Mídia inválida." }, { status: 400 });
  const professional = await ownedProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });
  const changed = await prisma.professionalMedia.updateMany({
    where: { id, professionalId: professional.id, hiddenAt: null },
    data: { hiddenAt: new Date(), hiddenReason: "Removida pela titular." },
  });
  if (!changed.count) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
