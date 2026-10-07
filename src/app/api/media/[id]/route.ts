export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { authorizeAdultContentRequest } from "@/lib/adult-content-access";
import { ageGateCacheHeaders } from "@/lib/age-gate-policy";
import { evaluateMediaPublicationGates } from "@/lib/media-security";
import { getMediaStorageProvider, type MediaStorageName } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";
import { getPublicProfessionalWhere } from "@/lib/public-professional-access";
import { controlledMediaAssetId, isApprovedProfileVisualAsset } from "@/lib/public-professional-media";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "media";
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const adultAccess = await authorizeAdultContentRequest(req, { allowAgeDeclaration: true });
  if (!adultAccess.ok) {
    return NextResponse.json(
      { error: adultAccess.error },
      { status: adultAccess.status, headers: adultAccess.headers },
    );
  }
  const { id } = await context.params;
  const limited = await enforceRateLimitAsync(
    `media:${adultAccess.session?.user.id ?? "age-declared"}:${getClientIP(req)}`,
    240,
    15 * 60 * 1000,
    "Muitas requisicoes de midia.",
  );
  if (limited) return limited;

  const asset = await prisma.uploadAsset.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      originalName: true,
      folder: true,
      category: true,
      detectedMimeType: true,
      status: true,
      visibility: true,
      uploadCompletedAt: true,
      malwareStatus: true,
      moderationStatus: true,
      ageIdentityStatus: true,
      consentStatus: true,
      adminReviewRequired: true,
      adminReviewStatus: true,
      takedownStatus: true,
      storageProvider: true,
      approvedBucket: true,
      approvedPath: true,
    },
  });
  const gates = asset ? evaluateMediaPublicationGates({
    uploadComplete: Boolean(asset.uploadCompletedAt),
    malwareStatus: asset.malwareStatus,
    moderationStatus: asset.moderationStatus,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    adminReviewRequired: asset.adminReviewRequired,
    adminReviewStatus: asset.adminReviewStatus,
    takedownStatus: asset.takedownStatus,
    ownerId: asset.userId,
  }) : null;
  if (!asset || asset.status !== "APPROVED" || !gates?.publishable || !asset.approvedBucket || !asset.approvedPath) {
    return NextResponse.json({ error: "Midia indisponivel." }, { status: 404, headers: ageGateCacheHeaders() });
  }

  const isOwner = asset.userId === adultAccess.session?.user.id;
  const isPrivateIdentityMaterial = asset.folder.startsWith("documentos") || asset.folder.startsWith("verificacao");
  const approvedProfileVisual = isApprovedProfileVisualAsset(asset);
  const logicalPrivate = isPrivateIdentityMaterial || (
    asset.visibility !== "PUBLIC" &&
    // Profile media is still served only by this authorized route and only
    // after every publication gate plus a live profile reference are checked.
    // This repairs stale PRIVATE flags left from quarantine without exposing
    // the underlying bucket or widening subscriber-only media.
    !(asset.visibility === "PRIVATE" && approvedProfileVisual)
  );
  let isAdmin = adultAccess.session?.user.role === "ADMIN";
  if (logicalPrivate && !isOwner) {
    const admin = await authorizeAdminRequest(isPrivateIdentityMaterial ? "kyc:review" : "reports:manage");
    if (!admin.ok) {
      return NextResponse.json({ error: "Midia indisponivel." }, { status: 404, headers: ageGateCacheHeaders() });
    }
    isAdmin = true;
  } else if (!isOwner) {
    const now = new Date();
    const publicWhere = await getPublicProfessionalWhere(now);
    const [profile, stories] = await Promise.all([
      prisma.professional.findFirst({
        where: { ...publicWhere, userId: asset.userId },
        select: {
          image: true,
          galleryUrls: true,
          presentationVideoUrl: true,
          presentationVideoStatus: true,
          photos: { where: { hiddenAt: null }, select: { url: true } },
          user: { select: { image: true } },
        },
      }),
      prisma.story.findMany({
        where: {
          userId: asset.userId,
          expiresAt: { gt: now },
          user: { professional: { is: { ...publicWhere, verified: true } } },
        },
        select: { mediaUrl: true, thumbnail: true },
      }),
    ]);
    const profileUrls = profile ? [
      profile.image,
      ...profile.galleryUrls,
      ...profile.photos.map((photo) => photo.url),
      profile.user.image,
      ...(profile.presentationVideoStatus === "APPROVED" ? [profile.presentationVideoUrl] : []),
    ] : [];
    const storyUrls = stories.flatMap((story) => [story.mediaUrl, story.thumbnail]);
    const hasPublicReference = [...profileUrls, ...storyUrls].some((url) => controlledMediaAssetId(url) === asset.id);
    if (!hasPublicReference) {
      return NextResponse.json({ error: "Midia indisponivel." }, { status: 404, headers: ageGateCacheHeaders() });
    }
  }

  const provider = getMediaStorageProvider(asset.storageProvider as MediaStorageName);
  if (asset.category === "video") {
    const signedUrl = await provider.getSignedUrl(asset.approvedBucket, asset.approvedPath, 60);
    await prisma.auditLog.create({
      data: {
        adminId: isAdmin ? adultAccess.session?.user.id ?? null : null,
        actorIdentifier: adultAccess.session?.user.id ?? "age-declared-visitor",
        action: "ADMIN_ACCESS",
        targetType: "CONTENT",
        targetId: asset.id,
        reason: "Entrega controlada de video por URL temporaria.",
        changes: { delivery: "SIGNED_REDIRECT", expiresInSeconds: 60, owner: isOwner },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    }).catch(() => undefined);
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: { ...ageGateCacheHeaders(), "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  let contents: Buffer;
  try {
    contents = await provider.download(asset.approvedBucket, asset.approvedPath);
  } catch (cause) {
    console.error("[media] arquivo aprovado ausente", { assetId: asset.id, provider: provider.name, cause });
    return NextResponse.json({ error: "Midia indisponivel." }, { status: 404, headers: ageGateCacheHeaders() });
  }

  return new Response(new Uint8Array(contents), {
    status: 200,
    headers: {
      "Content-Type": asset.detectedMimeType,
      "Content-Disposition": `inline; filename="${safeFilename(asset.originalName)}"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
    },
  });
}
