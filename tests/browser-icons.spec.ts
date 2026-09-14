import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const VERSION = "20260914";

async function sha256(path: string) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

test.describe("mascote oficial nos ícones do navegador", () => {
  test("metadata aponta para ícones versionados do mascote", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();

    expect(response.ok()).toBe(true);
    expect(html).toContain(`/favicon.ico?v=${VERSION}`);
    expect(html).toContain(`/brand/elite-modell-icon-512.png?v=${VERSION}`);
    expect(html).toContain(`/brand/elite-modell-apple-touch-icon.png?v=${VERSION}`);
    expect(html).toContain(`/og-image.png?v=${VERSION}`);
  });

  test("favicon, App Router e Apple usam os mesmos assets oficiais", async () => {
    await expect(sha256("src/app/favicon.ico")).resolves.toBe(await sha256("public/favicon.ico"));
    await expect(sha256("src/app/icon.png")).resolves.toBe(await sha256("public/brand/elite-modell-icon-512.png"));
    await expect(sha256("src/app/apple-icon.png")).resolves.toBe(await sha256("public/brand/elite-modell-apple-touch-icon.png"));
    await expect(sha256("public/apple-touch-icon.png")).resolves.toBe(await sha256("public/brand/elite-modell-apple-touch-icon.png"));
  });

  test("manifest usa o mascote e não o logo horizontal de interface", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    const manifest = await response.json() as { icons?: Array<{ src?: string }> };
    const iconSources = (manifest.icons ?? []).map((icon) => icon.src ?? "");

    expect(iconSources).toContain(`/brand/elite-modell-icon-192.png?v=${VERSION}`);
    expect(iconSources).toContain(`/brand/elite-modell-icon-512.png?v=${VERSION}`);
    expect(iconSources).toContain(`/brand/elite-modell-apple-touch-icon.png?v=${VERSION}`);
    expect(iconSources.some((src) => src.includes("logo-transparent"))).toBe(false);
  });

  test("cards Open Graph e Twitter usam a nova identidade", async () => {
    const socialHash = await sha256("public/og-image.png");
    expect(await sha256("src/app/opengraph-image.png")).toBe(socialHash);
    expect(await sha256("src/app/twitter-image.png")).toBe(socialHash);
  });
});
