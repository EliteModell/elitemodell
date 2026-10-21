import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { installMockSessionCookie } from "./helpers/mock-auth";

async function mockOnboarding(page: Page) {
  await installMockSessionCookie(page.context(), {
    id: "simple-onboarding-user",
    name: "Profissional Teste",
    email: "onboarding@example.invalid",
    role: "HOST",
    accountType: "model",
    isProfessional: true,
    professionalStatus: "DRAFT",
    activeProfileType: "PROFESSIONAL",
    availableProfiles: ["PROFESSIONAL"],
    adultVerified: true,
  }, { persistedProfessionalStatus: "DRAFT" });
  await page.addInitScript(() => {
    localStorage.setItem("elite_cookie_consent", "necessary");
    localStorage.setItem("elitemodell_ageConsentAccepted", "true");
    localStorage.removeItem("elitemodell.professional.simple-onboarding.v1");
  });
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    phoneVerified: true,
    professional: { status: "DRAFT", displayName: "", escortCategory: null, city: "", state: "", attendanceTypes: [], pricePerHour: null, bio: "", kycStatus: "APPROVED", photos: [] },
  } }));
  await page.route("**/api/didit/session", (route) => route.fulfill({ json: { available: true, sessionId: "didit-test", status: "APPROVED", retryAllowed: false } }));
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: { ok: true, savedStep: route.request().postDataJSON()?.step } }));
  await page.route("**/api/address/search**", (route) => route.fulfill({ json: { suggestions: [{ placeId: "city-sp", mainText: "São Paulo", secondaryText: "SP, Brasil" }] } }));
  await page.route("**/api/upload?folder=profiles/main", (route) => route.fulfill({ status: 202, json: { path: "/api/media/photo-test", status: "PENDING" } }));
  await page.route("**/api/media/photo-test", (route) => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/professionals", (route) => route.fulfill({ status: 201, json: { ok: true, status: "PENDING_REVIEW" } }));
}

test("fluxo reduzido tem cinco etapas, salva e envia sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOnboarding(page);
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 1 de 5")).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-01-dados-390.png", fullPage: true });
  await page.getByPlaceholder("Como clientes verão seu nome").fill("Luna Elite");
  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Confirme sua identidade" })).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-02-identidade-390.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Sua cidade e modalidade" })).toBeVisible();
  const city = page.getByPlaceholder("Selecione sua cidade");
  await city.fill("São Paulo");
  await page.getByRole("option").getByRole("button").first().click();
  await page.getByRole("button", { name: "Presencial" }).click();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-03-atendimento-390.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Uma foto e seu valor" })).toBeVisible();
  await page.getByPlaceholder("300").fill("350");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "public", "favicon-48x48.png"));
  await expect(page.getByText("Trocar foto")).toBeVisible();
  await expect(page.getByText("Foto recebida com segurança.")).toBeHidden({ timeout: 6_000 });
  await page.screenshot({ path: "artifacts/visual-review/onboarding-04-perfil-390.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Revise e envie" })).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-05-revisao-390.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await expect(page.getByRole("heading", { name: "Cadastro enviado com sucesso!" })).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-06-sucesso-390.png", fullPage: true });
});

test("etapa inicial permanece responsiva no celular, tablet e desktop", async ({ page }) => {
  await mockOnboarding(page);
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : width === 768 ? 900 : 1000 });
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Como você quer aparecer?" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `artifacts/visual-review/onboarding-responsive-${width}.png`, fullPage: true });
  }
});
