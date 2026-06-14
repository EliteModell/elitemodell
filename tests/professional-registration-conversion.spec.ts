import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
});

test("apresenta conversão original e validação por canal", async ({ page }) => {
  await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Anuncie seu perfil profissional" })).toBeVisible();
  await expect(page.getByText("Cadastro gratuito", { exact: true })).toBeVisible();
  await expect(page.getByText("Perfil verificado", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("fatalmodel");

  await page.getByLabel("Telefone profissional").fill("31999999999");
  await page.getByLabel("Confirmo que tenho 18 anos ou mais.").check();
  await page.getByLabel("Confirmo que o perfil será criado para mim.").check();
  await page.getByLabel(/Li e aceito os Termos de Uso/).check();
  await page.getByLabel(/Li a Política de Privacidade/).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Confirme seu telefone" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Receber código via WhatsApp/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Receber código via SMS/ })).toBeVisible();
});

test("envia a escolha de WhatsApp ao endpoint de OTP", async ({ page }) => {
  let requestBody: Record<string, unknown> | null = null;
  await page.route("**/api/auth/phone/send-code", async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, resendInSeconds: 60 }),
    });
  });
  await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Telefone profissional").fill("31999999999");
  await page.getByLabel("Confirmo que tenho 18 anos ou mais.").check();
  await page.getByLabel("Confirmo que o perfil será criado para mim.").check();
  await page.getByLabel(/Li e aceito os Termos de Uso/).check();
  await page.getByLabel(/Li a Política de Privacidade/).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Receber código via WhatsApp/ }).click();

  await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();
  expect(requestBody).toMatchObject({
    phone: "31999999999",
    accountType: "model",
    channel: "whatsapp",
    ageConfirmed: true,
    ownershipConfirmed: true,
    termsConsent: true,
    lgpdConsent: true,
  });
});

test("exibe simulador, benefícios e FAQ após a validação", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("elitemodell.professional-registration.verified", "true");
  });
  await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Quanto você pode faturar?" })).toBeVisible();
  await expect(page.getByText("Receita semanal", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seu perfil do seu jeito" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dúvidas frequentes" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Criar meu perfil profissional/ })).toBeVisible();
});

test("não cria rolagem horizontal no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
