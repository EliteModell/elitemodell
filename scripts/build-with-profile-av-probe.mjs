import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const productionMain = (process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production") &&
  process.env.VERCEL_GIT_COMMIT_REF === "main";

async function probeProfileScanner() {
  const endpoint = process.env.AV_HTTP_ENDPOINT?.trim();
  if (!endpoint || process.env.AV_ENABLED === "false") return "not-configured";
  const token = process.env.AV_HTTP_TOKEN?.trim();
  try {
    const image = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#7b55a5" } }).jpeg().toBuffer();
    const body = new FormData();
    body.set("file", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), "synthetic-profile-health.jpg");
    const response = await fetch(endpoint, {
      method: "POST",
      body,
      headers: token ? { Authorization: "Bearer " + token } : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "http-" + response.status;
    const result = await response.json().catch(() => null);
    return result?.safe === true && ["CLEAN", "APPROVED"].includes(String(result.status).trim().toUpperCase())
      ? "clean" : "invalid-result";
  } catch {
    return "unreachable";
  }
}

const status = productionMain ? await probeProfileScanner() : "not-run";
console.log("[profile-av] synthetic production probe:", status);
const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_PROFILE_AV_BUILD_RESULT: status },
});
if (build.error) throw build.error;
process.exitCode = build.status ?? 1;
