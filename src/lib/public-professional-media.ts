export type PublicProfileAsset = {
  id: string;
  userId: string;
  folder: string;
  category: string;
  status: string;
  moderationStatus?: string | null;
  approvedBucket: string | null;
  approvedPath: string | null;
};

export type PublicProfilePhoto = {
  id?: string;
  url: string;
  caption?: string | null;
  cover?: boolean;
  order?: number;
};

export function controlledMediaAssetId(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, "https://media.elitemodell.local");
    const match = url.pathname.match(/^\/api\/media\/([^/]+)\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function normalizeControlledMediaUrl(value?: string | null) {
  const assetId = controlledMediaAssetId(value);
  return assetId ? `/api/media/${encodeURIComponent(assetId)}` : null;
}

export function filterApprovedProfilePhotos(
  photos: PublicProfilePhoto[],
  assets: PublicProfileAsset[],
  ownerId: string,
) {
  const publicAssetIds = new Set(
    assets
      .filter((asset) =>
        asset.userId === ownerId &&
        asset.status === "APPROVED" &&
        asset.moderationStatus !== "REJECTED" &&
        asset.category === "image" &&
        asset.folder.startsWith("profiles") &&
        Boolean(asset.approvedBucket && asset.approvedPath),
      )
      .map((asset) => asset.id),
  );

  return photos
    .map((photo) => {
      const assetId = controlledMediaAssetId(photo.url);
      const url = normalizeControlledMediaUrl(photo.url);
      return assetId && url && publicAssetIds.has(assetId) ? { ...photo, url } : null;
    })
    .filter((photo): photo is PublicProfilePhoto => Boolean(photo));
}

export function visibleProfileMediaUrls(urls: string[], failedUrls: Iterable<string> = []) {
  const failed = new Set(failedUrls);
  return Array.from(new Set(urls.filter((url) => Boolean(url) && !failed.has(url))));
}

export function resolvePublicProfileMedia(input: {
  photos?: Array<{ url: string; cover?: boolean }>;
  image?: string | null;
  galleryUrls?: string[];
  avatar?: string | null;
  userImage?: string | null;
  failedUrls?: Iterable<string>;
}) {
  const storedCover = input.photos?.find((photo) => photo.cover)?.url
    ?? input.image
    ?? input.galleryUrls?.[0]
    ?? "";
  const relationGallery = input.photos?.filter((photo) => !photo.cover).map((photo) => photo.url) ?? [];
  const gallery = visibleProfileMediaUrls(
    [storedCover, ...(relationGallery.length ? relationGallery : input.galleryUrls ?? [])].filter(Boolean),
    input.failedUrls,
  );
  const cover = gallery.includes(storedCover) ? storedCover : gallery[0] ?? null;
  const avatar = visibleProfileMediaUrls(
    [cover ?? "", input.avatar ?? "", input.userImage ?? ""].filter(Boolean),
    input.failedUrls,
  )[0] ?? null;
  return { cover, avatar, gallery };
}
