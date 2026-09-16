import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function bypassAgeGate(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_cookie_consent", "accepted");
  });
}

test.describe("página de escolha de cadastro", () => {
  test.beforeEach(async ({ page }) => bypassAgeGate(page));

  test("usa exatamente a fotografia original fornecida", async () => {
    const original = await readFile("C:/Users/bruno/Downloads/b5ab551b-d422-4258-8dea-6a0d7668a7d8.png");
    const projectAsset = await readFile("public/images/registration/elite-registration-model.png");
    const digest = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");
    expect(digest(projectAsset)).toBe(digest(original));
  });

  test("preserva rotas e não inclui ações duplicadas no topo", async ({ page }) => {
    await page.goto("/cadastro", { waitUntil: "networkidle" });

    const choice = page.getByTestId("registration-choice-page");
    await expect(choice).toBeVisible();
    await expect(choice.getByRole("heading", { name: "Como você quer se cadastrar?" })).toBeVisible();
    await expect(choice.locator('img[src*="elite-registration-model.png"]')).toBeVisible();
    await expect(choice.getByRole("link", { name: /Cadastre-se como acompanhante/i })).toHaveAttribute(
      "href",
      "/cadastro/acompanhante",
    );
    await expect(choice.getByText("Já tem uma conta?").getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(choice.locator("header").getByRole("link", { name: /Entrar|Cadastrar/i })).toHaveCount(0);

    await choice.getByRole("button", { name: /Criar conta cliente/i }).click();
    await expect(page).toHaveURL(/\/cadastro\?tipo=cliente$/);
    await expect(page.getByRole("button", { name: /Trocar tipo de cadastro/i })).toBeVisible();
  });

  test("a home não recebe a nova fotografia", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain("elite-registration-model.png");
  });

  test("navega para acompanhante e login pelos destinos preservados", async ({ page }) => {
    await page.goto("/cadastro", { waitUntil: "networkidle" });
    await page.getByTestId("registration-choice-page")
      .getByRole("link", { name: /Cadastre-se como acompanhante/i })
      .click();
    await expect(page).toHaveURL(/\/cadastro\/acompanhante$/);

    await page.goto("/cadastro", { waitUntil: "networkidle" });
    await page.getByTestId("registration-choice-page").getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const width of [320, 360, 375, 390, 393, 414, 430, 768, 1024, 1440]) {
    test(`sem overflow e com composição íntegra em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
      await page.goto("/cadastro", { waitUntil: "networkidle" });

      const choice = page.getByTestId("registration-choice-page");
      await expect(choice).toBeVisible();
      const modelImage = choice.locator('img[src*="elite-registration-model.png"]');
      await expect(modelImage).toBeVisible();
      await expect.poll(() => modelImage.evaluate((image: HTMLImageElement) => image.naturalWidth > 0)).toBe(true);
      await expect(choice.getByRole("button", { name: /Criar conta cliente/i })).toBeVisible();
      await expect(choice.getByRole("link", { name: /Cadastre-se como acompanhante/i })).toBeVisible();
      await expect(choice.getByRole("link", { name: "Entrar" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      const panelBox = await choice.locator("section").first().boundingBox();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.x).toBeGreaterThanOrEqual(0);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width + 1);

      await page.screenshot({ path: `artifacts/visual-review/registration-choice-${width}.png`, fullPage: true });
    });
  }
});
