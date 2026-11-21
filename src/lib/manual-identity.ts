import "server-only";
import { SupabaseMediaStorageProvider } from "@/lib/media-storage";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MANUAL_IDENTITY_BUCKET, manualIdentityObjectPath } from "@/lib/manual-identity-policy";

export { sameIdentityOrigin } from "@/lib/manual-identity-policy";

export const identityBucket = MANUAL_IDENTITY_BUCKET;
export const identityStorage = new SupabaseMediaStorageProvider();
export const identityPath = manualIdentityObjectPath;
export const privateIdentityHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };

export async function assertPrivateIdentityBucket() {
  const { data, error } = await createSupabaseServerClient().storage.getBucket(identityBucket);
  if (error || data?.public !== false) throw new Error("Bucket privado indisponível.");
}

export { normalizeIdentityImage } from "@/lib/manual-identity-image";
