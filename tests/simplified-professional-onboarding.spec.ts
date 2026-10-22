import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { installMockSessionCookie } from "./helpers/mock-auth";

async function mockOnboarding(page: Page, kycStatus = "APPROVED", diditUrl: string | null = null, displayName = "", clearDraft = true) {
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
  await page.addInitScript(({ shouldClearDraft }) => {
    localStorage.setItem("elite_cookie_consent", "necessary");
    localStorage.setItem("elitemodell_ageConsentAccepted", "true");
    if (shouldClearDraft) {
      localStorage.removeItem("elitemodell.professional.simple-onboarding.v1");
      localStorage.removeItem("elitemodell.professional.simple-onboarding.step.v1");
    }
  }, { shouldClearDraft: clearDraft });
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    phoneVerified: true,
    professional: { status: "DRAFT", displayName, escortCategory: null, genderIdentity: null, transIdentity: null, city: "", state: "", attendanceTypes: [], pricePerHour: null, bio: "", kycStatus, photos: [] },
  } }));
  await page.route("**/api/didit/session", (route) => route.fulfill({ json: { available: true, sessionId: kycStatus === "NOT_STARTED" ? null : "didit-test", status: kycStatus, retryAllowed: kycStatus === "REJECTED", url: diditUrl } }));
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: { ok: true, savedStep: route.request().postDataJSON()?.step } }));
  await page.route("**/api/address/search**", (route) => route.fulfill({ json: { suggestions: [{ placeId: "city-sp", mainText: "São Paulo", secondaryText: "SP, Brasil" }] } }));
  await page.route("**/api/upload?folder=profiles/main", (route) => route.fulfill({ status: 202, json: { path: "/api/media/photo-test", status: "PENDING" } }));
  await page.route("**/api/media/photo-test", (route) => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/professionals", (route) => route.fulfill({ status: 201, json: { ok: true, status: kycStatus === "APPROVED" ? "PENDING_REVIEW" : "DRAFT", identityPending: kycStatus !== "APPROVED", identityStatus: kycStatus } }));
}

test("placeholder técnico não trava a primeira etapa e o nome escolhido é salvo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOnboarding(page, "PENDING", null, "Cadastro de acompanhante", false);
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  const name = page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...");
  await expect(name).toHaveValue("");
  await name.fill("Marina Elite");
  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByRole("button", { name: "Não", exact: true }).click();

  const draftRequest = page.waitForRequest((request) => request.url().includes("/api/professionals/draft") && request.method() === "PATCH");
  await page.getByRole("button", { name: "Continuar" }).click();
  const payload = (await draftRequest).postDataJSON();
  expect(payload).toMatchObject({ step: 0, flow: "simplified-v1", form: { displayName: "Marina Elite", genderIdentity: "MULHER", transIdentity: "NAO" } });
  await expect(page.getByRole("heading", { name: "Confirme sua identidade" })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Confirme sua identidade" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("elitemodell.professional.simple-onboarding.v1") || "{}").displayName)).toBe("Marina Elite");
});

for (const scenario of [
  { status: 401, apiError: "Não autorizado.", expected: "Sua sessão expirou. Entre novamente para continuar o cadastro." },
  { status: 409, apiError: "Este cadastro foi atualizado em outra sessão. Recarregue e tente novamente.", expected: "Este cadastro foi atualizado em outra sessão." },
  { status: 422, apiError: "Complete os campos obrigatórios desta etapa: Nome profissional.", expected: "Complete os campos obrigatórios desta etapa: Nome profissional." },
  { status: 500, apiError: "Não foi possível salvar esta etapa.", expected: "Não foi possível salvar esta etapa." },
] as const) {
  test(`falha ${scenario.status} da API fica visível e permite nova tentativa`, async ({ page }) => {
    await mockOnboarding(page);
    await page.unroute("**/api/professionals/draft");
    await page.route("**/api/professionals/draft", (route) => route.fulfill({
      status: scenario.status,
      json: { error: scenario.apiError },
    }));
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Marina Retomada");
    await page.getByRole("button", { name: "Mulher" }).click();
    await page.getByRole("button", { name: "Não", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: scenario.expected })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });
}

test("fluxo reduzido tem cinco etapas, salva e envia sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOnboarding(page);
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 1 de 5")).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-01-dados-390.png", fullPage: true });
  await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Luna Elite");
  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByRole("button", { name: "Não", exact: true }).click();
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
  await page.getByRole("button", { name: "Enviar informações" }).click();
  await expect(page.getByRole("heading", { name: "Cadastro recebido com sucesso!" })).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-06-sucesso-390.png", fullPage: true });
});

test("Didit pendente permite concluir dados sem publicar o perfil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOnboarding(page, "PENDING");
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Luna Pendente");
  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByRole("button", { name: "Sim", exact: true }).click();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-gender-390.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Verificação de identidade em análise")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-didit-pending-390.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Selecione sua cidade").fill("São Paulo");
  await page.getByRole("option").getByRole("button").first().click();
  await page.getByRole("button", { name: "Presencial" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("300").fill("350");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "public", "favicon-48x48.png"));
  await expect(page.getByText("Trocar foto")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Enviar informações" }).click();
  await expect(page.getByRole("heading", { name: "Cadastro recebido com sucesso!" })).toBeVisible();
  await expect(page.getByText("Sua verificação de identidade ainda está em andamento.")).toBeVisible();
  await expect(page.getByText(/Seu perfil não ficará público/)).toBeVisible();
  await page.screenshot({ path: "artifacts/visual-review/onboarding-success-pending-390.png", fullPage: true });
});

for (const scenario of [
  { status: "NOT_STARTED", expected: "Verificar minha identidade" },
  { status: "REJECTED", expected: "Tentar novamente" },
] as const) {
  test(`estado Didit ${scenario.status} orienta sem bloquear o preenchimento`, async ({ page }) => {
    await mockOnboarding(page, scenario.status);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Perfil Teste");
    await page.getByRole("button", { name: "Não binário" }).click();
    await page.getByRole("button", { name: "Prefiro não informar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("button", { name: scenario.expected })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });
}

test("sessão Didit interrompida é retomada sem criar outra", async ({ page }) => {
  await mockOnboarding(page, "PENDING", "https://verification.didit.me/session/resume-test");
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Perfil Retomada");
  await page.getByRole("button", { name: "Prefiro me autodescrever" }).click();
  await page.getByPlaceholder("Escreva com suas palavras").fill("Pessoa não binária");
  await page.getByRole("button", { name: "Prefiro não informar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Retomar verificação" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
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
