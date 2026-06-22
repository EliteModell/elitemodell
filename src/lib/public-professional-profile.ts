import { stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { normalizeControlledMediaUrl } from "@/lib/public-professional-media";

export const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export function isProfessionalOnline(
  lastOnlineAt: Date | string | null | undefined,
  onlineVisible = true,
  now = new Date(),
) {
  if (!onlineVisible || !lastOnlineAt) return false;
  return now.getTime() - new Date(lastOnlineAt).getTime() <= ONLINE_WINDOW_MS;
}

export function canonicalProfessionalPhotos(input: {
  photos?: Array<{ id?: string; url: string; caption?: string | null; cover?: boolean; order?: number }>;
  image?: string | null;
  galleryUrls?: string[];
}) {
  const relationPhotos = (input.photos ?? [])
    .map((photo, index) => ({
      ...photo,
      url: normalizeControlledMediaUrl(photo.url) ?? stripLegacyPublicStorageUrl(photo.url),
      cover: Boolean(photo.cover),
      order: photo.order ?? index,
    }))
    .filter((photo): photo is typeof photo & { url: string } => Boolean(photo.url))
    .sort((a, b) => a.order - b.order);

  if (relationPhotos.length > 0) return relationPhotos;

  const legacy = [input.image, ...(input.galleryUrls ?? [])]
    .map((url) => normalizeControlledMediaUrl(url) ?? stripLegacyPublicStorageUrl(url))
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(legacy)).map((url, index) => ({
    url,
    cover: index === 0,
    order: index,
    caption: null,
  }));
}

export function publicCoverImage(input: Parameters<typeof canonicalProfessionalPhotos>[0]) {
  const photos = canonicalProfessionalPhotos(input);
  return photos.find((photo) => photo.cover)?.url ?? photos[0]?.url ?? null;
}

export function calculateAge(birthDate: Date | string | null | undefined, now = new Date()) {
  if (!birthDate) return null;
  const birthIso = birthDate instanceof Date ? birthDate.toISOString() : birthDate;
  const birthMatch = birthIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!birthMatch) return null;
  const [, birthYear, birthMonth, birthDay] = birthMatch.map(Number);
  const currentParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const current = Object.fromEntries(
    currentParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as { year: number; month: number; day: number };
  let age = current.year - birthYear;
  const month = current.month - birthMonth;
  if (month < 0 || (month === 0 && current.day < birthDay)) age -= 1;
  return age;
}

export function publicCacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
