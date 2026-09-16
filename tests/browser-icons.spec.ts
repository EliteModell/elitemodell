import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

const TITLE = "Elite Modell | Conexões Discretas e Seguras";
const DESCRIPTION =
  "Encontre perfis verificados com privacidade, segurança e liberdade. Conheça a Elite Modell e explore perfis disponíveis na sua região com facilidade.";

async function sha256(filePath: string) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function imageMetadata(filePath: string) {
  const metadata = await sharp(filePath).metadata();
  return { width: metadata.width, height: metadata.height, format: metadata.format, hasAlpha: metadata.hasAlpha };
}

test.describe("identidade visual nos navegadores e compartilhamentos", () => {
  test("head usa metadata SEO limpa e arquivos especiais do App Router", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();

    expect(response.ok()).toBe(true);
    expect(html).toContain(`<title>${TITLE}</title>`);
    expect(html).toContain(`content="${DESCRIPTION}"`);
    expect(html).toContain(`<meta property="og:title" content="${TITLE}"`);
    expect(html).toContain(`<meta name="twitter:title" content="${TITLE}"`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<link rel="canonical" href="https://www.elitemodell.com.br"');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain("/favicon.ico?");
    expect(html).toContain("/icon.png?");
    expect(html).toContain("/apple-icon.png?");
    expect(html).toContain("/opengraph-image.png?");
    expect(html).toContain("/twitter-image.png?");
    expect(html).not.toContain("?v=20260914");
    expect(html).toContain('"@type":"WebSite"');

    const iconHrefs = [...html.matchAll(/<link rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(iconHrefs).size).toBe(iconHrefs.length);
  });

  test("favicon ICO contém 16, 32 e 48 px e os PNGs mantêm transparência", async () => {
    const ico = await readFile("public/favicon.ico");
    expect(ico.readUInt16LE(4)).toBe(3);
    const sizes = Array.from({ length: 3 }, (_, index) => ico.readUInt8(6 + index * 16));
    expect(sizes).toEqual([16, 32, 48]);

    for (const size of [16, 32, 48]) {
      await expect(imageMetadata(`public/favicon-${size}x${size}.png`)).resolves.toEqual({
        width: size,
        height: size,
        format: "png",
        hasAlpha: true,
      });
    }
  });

  test("Apple, Android e App Router usam o mesmo mascote oficial", async () => {
    await expect(imageMetadata("public/apple-touch-icon.png")).resolves.toMatchObject({ width: 180, height: 180, format: "png" });
    await expect(imageMetadata("public/android-chrome-192x192.png")).resolves.toMatchObject({ width: 192, height: 192, format: "png" });
    await expect(imageMetadata("public/android-chrome-512x512.png")).resolves.toMatchObject({ width: 512, height: 512, format: "png" });
    await expect(sha256("src/app/favicon.ico")).resolves.toBe(await sha256("public/favicon.ico"));
    await expect(sha256("src/app/icon.png")).resolves.toBe(await sha256("public/android-chrome-512x512.png"));
    await expect(sha256("src/app/apple-icon.png")).resolves.toBe(await sha256("public/apple-touch-icon.png"));
    await expect(sha256("public/brand/elite-modell-icon-192.png")).resolves.toBe(await sha256("public/android-chrome-192x192.png"));
    await expect(sha256("public/brand/elite-modell-icon-512.png")).resolves.toBe(await sha256("public/android-chrome-512x512.png"));
  });

  test("manifest referencia somente os ícones PWA atuais", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    const manifest = await response.json() as { icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }> };
    expect(response.ok()).toBe(true);
    expect(manifest.icons).toEqual([
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/android-chrome-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
    expect(JSON.stringify(manifest)).not.toContain("logo-transparent");
    expect(JSON.stringify(manifest)).not.toContain("?v=");
  });

  test("Open Graph e Twitter usam imagem própria 1200x630", async () => {
    await expect(imageMetadata("public/og-image.png")).resolves.toMatchObject({ width: 1200, height: 630, format: "png" });
    const socialHash = await sha256("public/og-image.png");
    expect(await sha256("src/app/opengraph-image.png")).toBe(socialHash);
    expect(await sha256("src/app/twitter-image.png")).toBe(socialHash);
  });

  test("todas as URLs públicas da identidade respondem sem 404", async ({ request }) => {
    for (const url of [
      "/favicon.ico",
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/favicon-48x48.png",
      "/apple-touch-icon.png",
      "/android-chrome-192x192.png",
      "/android-chrome-512x512.png",
      "/android-chrome-maskable-512x512.png",
      "/brand/elite-modell-symbol.png",
      "/brand/elite-modell-logo.png",
      "/og-image.png",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
    ]) {
      const response = await request.get(url);
      expect(response.ok(), `${url} retornou ${response.status()}`).toBe(true);
    }
  });
});
