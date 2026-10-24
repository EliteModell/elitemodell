import { expect, test, type Page } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

const ADULT_VIEWER = {
  id: "home-adult-viewer",
  name: "Visitante verificado",
  email: "home-viewer@teste.elitemodell.local",
  role: "GUEST",
  accountType: "client",
  adultVerified: true,
  activeProfileType: "CLIENTE" as const,
  availableProfiles: ["CLIENTE"] as Array<"CLIENTE" | "PROFESSIONAL" | "HOST">,
};

async function prepareHome(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_cookie_consent", "accepted");
  });
  await page.route("**/api/address/search?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ suggestions: [{ placeId: "bh", mainText: "Belo Horizonte", secondaryText: "Minas Gerais, Brasil" }] }),
  }));
}

test.describe("home fiel à referência mobile", () => {
  test.beforeEach(async ({ page }) => prepareHome(page));

  test("busca por cidade usa o filtro real", async ({ page }) => {
    await installMockSessionCookie(page.context(), ADULT_VIEWER);
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: ADULT_VIEWER, expires: new Date(Date.now() + 86_400_000).toISOString() }),
    }));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const search = page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" });
    await search.fill("Belo");
    await page.getByRole("option").filter({ hasText: "Belo Horizonte, MG" }).getByRole("button").click();
    await page.getByRole("button", { name: "Buscar perfis" }).click();
    await expect(page).toHaveURL(/\/buscar\?tab=acompanhantes&cidade=Belo\+Horizonte&estado=mg/);
  });

  test("conteúdo e rotas principais permanecem corretos", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encontre o perfil certo para você.");
    await expect(page.getByRole("main").getByRole("link", { name: "Explorar perfis" }).first()).toHaveAttribute("href", "/buscar?tab=acompanhantes&selecionarCidade=1");
    await expect(page.getByRole("main").getByRole("link", { name: "Anunciar meu perfil" })).toHaveAttribute("href", "/cadastro/acompanhante");
    await expect(page.locator("nav img").first()).toHaveAttribute("src", /elite-modell-logo\.png/);
    await expect(page.getByRole("heading", { name: "Stories e perfis da região" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Profissionais em destaque" })).toBeVisible();
  });

  test("fotos promocionais permanecem grandes e empilhadas verticalmente", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const campaign = page.getByRole("region", { name: "Garotas-propaganda Elite Modell" });
    await campaign.scrollIntoViewIfNeeded();

    const images = campaign.getByRole("img");
    await expect(images).toHaveCount(3);
    await expect(images.nth(0)).toHaveAttribute("alt", /peças roxas/);
    await expect(images.nth(1)).toHaveAttribute("alt", /look dourado/);
    await expect(images.nth(2)).toHaveAttribute("alt", /look marrom junto à piscina/);
    const boxes = await images.evaluateAll((items) => items.map((item) => item.getBoundingClientRect()));
    expect(boxes.every((box) => Math.abs(box.width - boxes[0].width) <= 1)).toBe(true);
    expect(boxes[0].width).toBeGreaterThan(340);
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index - 1].bottom);
      expect(boxes[index].top - boxes[index - 1].bottom).toBeLessThanOrEqual(12);
    }
  });

  test("toque recebe estado visual imediato sem atrasar a navegação", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const announce = page.getByRole("main").getByRole("link", { name: "Anunciar meu perfil" });
    await announce.dispatchEvent("pointerdown", { button: 0, pointerType: "touch", isPrimary: true });
    await expect(announce).toHaveAttribute("data-interaction-active", "true");
    await announce.dispatchEvent("pointerup", { button: 0, pointerType: "touch", isPrimary: true });
    await expect(announce).toHaveAttribute("data-interaction-active", "true");
    await expect.poll(() => announce.getAttribute("data-interaction-active")).toBeNull();
  });

  for (const width of [320, 360, 375, 390, 414, 430, 768, 1024, 1440]) {
    test(`layout sem overflow e controles compactos em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByRole("img", { name: "Modelo da Elite Modell" })).toBeVisible();
      await expect(page.getByRole("search", { name: "Buscar acompanhantes por cidade" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Explorar perfis" }).first()).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Anunciar meu perfil" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const controlHeight = await page.getByRole("combobox").evaluate((input) => input.parentElement?.getBoundingClientRect().height ?? 999);
      expect(controlHeight).toBeLessThanOrEqual(60);
      await page.screenshot({ path: `artifacts/visual-review/home-mobile-${width}.png`, fullPage: false });
    });
  }
});
