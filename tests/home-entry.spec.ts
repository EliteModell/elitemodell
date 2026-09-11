import { expect, test, type Page } from "@playwright/test";

async function bypassAgeGate(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
}

test.describe("entrada principal da home", () => {
  test.beforeEach(async ({ page }) => {
    await bypassAgeGate(page);
    await page.route("**/api/address/search?**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "google",
        suggestions: [{
          placeId: "belo-horizonte-test",
          mainText: "Belo Horizonte",
          secondaryText: "Minas Gerais, Brasil",
        }],
      }),
    }));
  });

  test("busca cidade real e navega com o filtro existente", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encontre quem combina com você.");
    const search = page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" });
    await search.fill("Belo");
    await page.getByRole("option").filter({ hasText: "Belo Horizonte, MG" }).getByRole("button").click();
    await page.getByRole("button", { name: "Buscar perfis" }).click();

    await expect(page).toHaveURL(/\/buscar\?tab=acompanhantes&cidade=Belo\+Horizonte&estado=mg/);
  });

  test("CTAs mantêm as rotas existentes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Explorar perfis" })).toHaveAttribute(
      "href",
      "/buscar?tab=acompanhantes&selecionarCidade=1",
    );
    await expect(page.getByRole("link", { name: "Criar meu perfil" })).toHaveAttribute(
      "href",
      "/cadastro/acompanhante",
    );
  });

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    test(`${viewport.name}: sem overflow e com logo nítido e proporcional`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const logo = page.locator("nav img").first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("src", /elite-modell-symbol-v20260911\.png/);
      await expect(page.getByRole("search", { name: "Buscar acompanhantes por cidade" })).toBeVisible();
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Explorar perfis" })).toBeVisible();
      await expect(main.getByRole("link", { name: "Criar meu perfil" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const logoStyle = await logo.evaluate((element) => {
        const style = getComputedStyle(element);
        return { filter: style.filter, opacity: style.opacity, objectFit: style.objectFit };
      });
      expect(logoStyle).toEqual({ filter: "none", opacity: "1", objectFit: "contain" });
    });
  }
});
