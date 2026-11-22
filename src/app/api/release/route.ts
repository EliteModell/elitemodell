import { assertPrivateIdentityBucket } from "@/lib/manual-identity";
import { identityRuntimeEnabled } from "@/lib/manual-identity-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const production = process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production";
  const preview = process.env.VERCEL_ENV === "preview" || process.env.VERCEL_TARGET_ENV === "preview";
  const environment = production ? "production" : preview ? "preview" : "development";
  const manualIdentityEnabled = await identityRuntimeEnabled();
  const manualIdentityStorageReady = manualIdentityEnabled && await assertPrivateIdentityBucket().then(() => true, () => false);
  return Response.json({
    environment,
    production: environment === "production",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    manualIdentityEnabled,
    manualIdentityStorageReady,
  }, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate, no-transform",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
