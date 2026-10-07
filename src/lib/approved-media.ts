import "server-only";

import { hasPublicStoragePath } from "@/lib/age-gate-policy";
import { prisma } from "@/lib/prisma";
import { controlledMediaAssetId } from "@/lib/public-professional-media";
import { evaluateMediaPublicationGates } from "@/lib/media-security";

export function controlledAssetId(value: string, requestUrl: string) {
  try {
    const url = new URL(value, requestUrl);
    if (url.origin !== new URL(requestUrl).origin) return null;
    return controlledMediaAssetId(url.pathname);
  } catch {
    return null;
  }
}

function isLegacyPlatformMedia(value: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return Boolean(
    (supabaseUrl && value.startsWith(`${supabaseUrl}/storage/v1/object/public/`)) ||
    hasPublicStoragePath(value),
  );
}

export async function assertApprovedMediaUrls(input: {
  urls: string[];
  requestUrl: string;
  ownerId: string;
  allowedFolderPrefixes: string[];
}) {
  const controlled = input.urls
    .map((url) => ({ url, id: controlledAssetId(url, input.requestUrl) }))
    .filter((entry): entry is { url: string; id: string } => Boolean(entry.id));
  const legacyPublic = input.urls.filter((url) => isLegacyPlatformMedia(url));
  if (legacyPublic.length > 0) {
    throw new Error("A midia publica antiga precisa ser migrada para a rota controlada /api/media antes da publicacao.");
  }

  const invalidExternal = input.urls.filter(
    (url) => !controlledAssetId(url, input.requestUrl),
  );
  if (invalidExternal.length > 0) {
    throw new Error("A midia precisa ter sido enviada e aprovada pela plataforma.");
  }
  if (controlled.length === 0) return;

  const assets = await prisma.uploadAsset.findMany({
    where: { id: { in: controlled.map((entry) => entry.id) } },
    select: {
      id: true,
      userId: true,
      folder: true,
      status: true,
      uploadCompletedAt: true,
      malwareStatus: true,
      moderationStatus: true,
      ageIdentityStatus: true,
      consentStatus: true,
      adminReviewRequired: true,
      adminReviewStatus: true,
      takedownStatus: true,
    },
  });
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const entry of controlled) {
    const asset = byId.get(entry.id);
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
    if (
      !asset ||
      asset.userId !== input.ownerId ||
      asset.status !== "APPROVED" ||
      !gates?.publishable ||
      !input.allowedFolderPrefixes.some((prefix) => asset.folder.startsWith(prefix))
    ) {
      throw new Error("A midia informada esta pendente, rejeitada ou pertence a outra conta.");
    }
  }
}

/**
 * Validates references attached to a professional registration draft.
 * This intentionally does not make the asset public: publication continues
 * to require assertApprovedMediaUrls/evaluateMediaPublicationGates.
 */
export async function assertOwnedUploadMediaUrls(input: {
  urls: string[];
  requestUrl: string;
  ownerId: string;
  allowedFolderPrefixes: string[];
}) {
  const entries = input.urls.map((url) => ({ url, id: controlledAssetId(url, input.requestUrl) }));
  if (entries.some((entry) => !entry.id)) {
    throw new Error("A midia precisa ter sido enviada pela plataforma.");
  }
  if (entries.length === 0) return;

  const ids = entries.map((entry) => entry.id).filter((id): id is string => Boolean(id));
  const assets = await prisma.uploadAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      folder: true,
      status: true,
      uploadCompletedAt: true,
      malwareStatus: true,
    },
  });
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const id of ids) {
    const asset = byId.get(id);
    if (
      !asset ||
      asset.userId !== input.ownerId ||
      !asset.uploadCompletedAt ||
      asset.status === "REJECTED" ||
      asset.malwareStatus === "INFECTED" ||
      !input.allowedFolderPrefixes.some((prefix) => asset.folder.startsWith(prefix))
    ) {
      throw new Error("A midia informada nao foi recebida com seguranca ou pertence a outra conta.");
    }
  }
}
