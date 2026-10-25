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
const MAX_PREFETCHED_PROFILES = 4;
const preloadedCovers = new Map<string, HTMLImageElement>();
const prefetchedProfiles = new Map<string, Promise<unknown>>();
const navigationPreviews = new Map<string, ProfessionalNavigationPreview>();
const navigationPreviewListeners = new Set<() => void>();

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

export function rememberProfessionalNavigationPreview(preview: ProfessionalNavigationPreview) {
  if (typeof window === "undefined") return;
  navigationPreviews.set(preview.slug, preview);
  try {
    window.sessionStorage.setItem(storageKey(preview.slug), JSON.stringify(preview));
  } catch {
    // Navigation still works when storage is unavailable.
  }
  navigationPreviewListeners.forEach((listener) => listener());
}

export function readProfessionalNavigationPreview(slug: string) {
  if (typeof window === "undefined") return null;
  const cached = navigationPreviews.get(slug);
  if (cached) return cached;
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProfessionalNavigationPreview>;
    if (parsed.slug !== slug || typeof parsed.displayName !== "string") return null;
    const preview = {
      slug,
      displayName: parsed.displayName,
      image: typeof parsed.image === "string" ? parsed.image : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
      state: typeof parsed.state === "string" ? parsed.state : null,
    } satisfies ProfessionalNavigationPreview;
    navigationPreviews.set(slug, preview);
    return preview;
  } catch {
    return null;
  }
}

export function subscribeProfessionalNavigationPreview(listener: () => void) {
  navigationPreviewListeners.add(listener);
  return () => {
    navigationPreviewListeners.delete(listener);
  };
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

export function loadProfessionalProfileData<T>(slug: string): Promise<T> {
  const cached = prefetchedProfiles.get(slug);
  if (cached) return cached as Promise<T>;

  const request = fetch(`/api/professionals/${encodeURIComponent(slug)}`, { cache: "default" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`profile_http_${response.status}`);
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      prefetchedProfiles.delete(slug);
      throw error;
    });
  prefetchedProfiles.set(slug, request);

  while (prefetchedProfiles.size > MAX_PREFETCHED_PROFILES) {
    const oldest = prefetchedProfiles.keys().next().value as string | undefined;
    if (!oldest || oldest === slug) break;
    prefetchedProfiles.delete(oldest);
  }
  return request;
}

export function prefetchProfessionalProfileData(slug: string, userIntent = false) {
  if (typeof window === "undefined" || prefetchedProfiles.has(slug)) return;
  if (!userIntent && prefetchedProfiles.size >= MAX_PREFETCHED_PROFILES) return;
  void loadProfessionalProfileData(slug).catch(() => undefined);
}
