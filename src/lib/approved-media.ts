import "server-only";

import { hasPublicStoragePath } from "@/lib/age-gate-policy";
import { prisma } from "@/lib/prisma";
import { controlledMediaAssetId } from "@/lib/public-professional-media";

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
    select: { id: true, userId: true, folder: true, status: true },
  });
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const entry of controlled) {
    const asset = byId.get(entry.id);
    if (
      !asset ||
      asset.userId !== input.ownerId ||
      asset.status !== "APPROVED" ||
      !input.allowedFolderPrefixes.some((prefix) => asset.folder.startsWith(prefix))
    ) {
      throw new Error("A midia informada esta pendente, rejeitada ou pertence a outra conta.");
    }
  }
}
