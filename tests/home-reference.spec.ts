import { expect, test, type Page } from "@playwright/test";

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
    await expect(page.getByRole("main").getByText("Discrição • Segurança • Liberdade", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Explorar perfis" }).first()).toHaveAttribute("href", "/buscar?tab=acompanhantes&selecionarCidade=1");
    await expect(page.getByRole("main").getByRole("link", { name: "Anunciar meu perfil" })).toHaveAttribute("href", "/cadastro/acompanhante");
    await expect(page.locator("nav img").first()).toHaveAttribute("src", /elite-modell-logo\.png/);
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
