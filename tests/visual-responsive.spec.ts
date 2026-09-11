import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const publicRoutes = ["/", "/login", "/cadastro", "/cadastro/acompanhante", "/buscar?tab=acompanhantes"];

test.describe("tema claro responsivo", () => {
  for (const width of widths) {
    test(`home sem overflow em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: /Encontre quem combina com você/i })).toBeVisible();
      await expect(page.getByRole("img", { name: "Modelo da Elite Modell" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      const bodyBackground = await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor);
      expect(bodyBackground).not.toBe("rgb(0, 0, 0)");
    });
  }

  for (const route of publicRoutes) {
    test(`${route} mantém navegação e largura útil`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(page.url()).not.toContain("/_not-found");
    });
  }
});
