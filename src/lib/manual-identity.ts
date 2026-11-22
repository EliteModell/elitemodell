import "server-only";
import { SupabaseMediaStorageProvider } from "@/lib/media-storage";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MANUAL_IDENTITY_BUCKET, MANUAL_IDENTITY_PRODUCTION_STORAGE, manualIdentityObjectPath } from "@/lib/manual-identity-policy";

export { sameIdentityOrigin } from "@/lib/manual-identity-policy";

export const identityBucket = MANUAL_IDENTITY_BUCKET;
function identityStorageClient() {
  return createSupabaseServerClient(process.env.NODE_ENV === "production" ? MANUAL_IDENTITY_PRODUCTION_STORAGE : undefined);
}

export const identityStorage = new SupabaseMediaStorageProvider(identityStorageClient);
export const identityPath = manualIdentityObjectPath;
export const privateIdentityHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };

export async function assertPrivateIdentityBucket() {
  const { data, error } = await identityStorageClient().storage.getBucket(identityBucket);
  if (error || data?.public !== false) throw new Error("Bucket privado indisponível.");
}

export { normalizeIdentityImage } from "@/lib/manual-identity-image";
