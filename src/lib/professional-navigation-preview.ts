import { controlledMediaVariantUrl } from "@/lib/public-professional-media";

export type ProfessionalNavigationPreview = {
  slug: string;
  displayName: string;
  image: string | null;
  city?: string | null;
  state?: string | null;
};

const STORAGE_PREFIX = "elite_professional_navigation_preview:";
const MAX_PRELOADED_COVERS = 6;
const preloadedCovers = new Map<string, HTMLImageElement>();

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

export function rememberProfessionalNavigationPreview(preview: ProfessionalNavigationPreview) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(preview.slug), JSON.stringify(preview));
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

export function readProfessionalNavigationPreview(slug: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProfessionalNavigationPreview>;
    if (parsed.slug !== slug || typeof parsed.displayName !== "string") return null;
    return {
      slug,
      displayName: parsed.displayName,
      image: typeof parsed.image === "string" ? parsed.image : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
      state: typeof parsed.state === "string" ? parsed.state : null,
    } satisfies ProfessionalNavigationPreview;
  } catch {
    return null;
  }
}

export function preloadProfessionalCover(preview: ProfessionalNavigationPreview) {
  if (typeof window === "undefined" || !preview.image) return;
  const url = controlledMediaVariantUrl(preview.image, "cover");
  if (preloadedCovers.has(url)) return;

  const image = new window.Image();
  image.decoding = "async";
  image.fetchPriority = "auto";
  image.src = url;
  preloadedCovers.set(url, image);

  while (preloadedCovers.size > MAX_PRELOADED_COVERS) {
    const oldest = preloadedCovers.keys().next().value as string | undefined;
    if (!oldest) break;
    preloadedCovers.delete(oldest);
  }
}
