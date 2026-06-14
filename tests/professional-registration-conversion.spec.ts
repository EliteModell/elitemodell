import { expect, test } from "@playwright/test";
import { cadastroHrefForRole } from "../src/lib/account-routes";
import {
  createPendingProfessionalPhoneToken,
  verifyPendingProfessionalPhoneToken,
} from "../src/lib/phone-otp";

test("rota profissional pública sempre começa na landing", () => {
  expect(cadastroHrefForRole("profissional")).toBe("/cadastro/acompanhante");
});

test("pré-validação do telefone usa token assinado e rejeita adulteração", () => {
  const token = createPendingProfessionalPhoneToken("31999999999", "verification-test");
  expect(verifyPendingProfessionalPhoneToken(token)).toMatchObject({
    phone: "31999999999",
    verificationId: "verification-test",
  });
  expect(verifyPendingProfessionalPhoneToken(`${token}alterado`)).toBeNull();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
});

test("apresenta conversão original e validação por canal", async ({ page }) => {
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Cadastre-se grátis como acompanhante" })).toBeVisible();
  await expect(page.getByText("Cadastro gratuito", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Perfil verificado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quanto você pode faturar?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dúvidas frequentes" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("fatalmodel");

  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  await page.getByLabel("Qual seu número de telefone?").fill("31999999999");
  await page.getByLabel(/Ao continuar, confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(
    page.getByRole("heading", { name: "Valide seu telefone para continuar" }),
  ).toBeVisible();
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
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Qual seu número de telefone?").fill("31999999999");
  await page.getByLabel(/Ao continuar, confirmo que tenho 18 anos ou mais/).check();
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

test("após validar o código abre a ativação profissional completa", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, resendInSeconds: 60 }),
    });
  });
  await page.route("**/api/auth/phone/verify-code", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      phone: "31999999999",
      code: "123456",
      accountType: "model",
      deferAccountCreation: true,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        registrationPending: true,
        redirectTo: "/cadastro?tipo=acompanhante&telefoneValidado=1",
      }),
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  await page.getByLabel("Qual seu número de telefone?").fill("31999999999");
  await page.getByLabel(/Ao continuar, confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByRole("button", { name: /Receber código via WhatsApp/ }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Validar e continuar" }).click();

  await page.waitForURL(/\/cadastro\?tipo=acompanhante&telefoneValidado=1/);
  await expect(page.getByText("Cadastro de acompanhante +18", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar com Google" })).toBeVisible();
  await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
  await expect(page.getByText("Data de nascimento", { exact: true })).toBeVisible();
});

test("não cria rolagem horizontal no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
