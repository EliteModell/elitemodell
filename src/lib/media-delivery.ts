import type { MediaStorageName } from "@/lib/media-storage";

export const CONTROLLED_MEDIA_SIGNED_URL_TTL_SECONDS = 60;

export function controlledMediaDeliveryMode(storageProvider: MediaStorageName, category: string) {
  if (storageProvider === "SUPABASE") return "SIGNED_REDIRECT" as const;
  if (category === "video") return "SIGNED_REDIRECT" as const;
  return "BUFFERED_FALLBACK" as const;
}
