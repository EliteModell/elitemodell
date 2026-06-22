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
  await expect(page.getByRole("button", { name: /Receber código via SMS/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /WhatsApp/i })).toHaveCount(0);
});

test("envia código profissional somente por SMS", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/auth/phone/send-code", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Qual seu número de telefone?").fill("31999999999");
  await page.getByLabel(/Ao continuar, confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Receber código via SMS/ }).click();

  await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();
  expect(payload).toMatchObject({
    phone: "31999999999",
    accountType: "model",
    channel: "sms",
  });
});

test("HTML inesperado da API mostra erro amigável sem quebrar a tela", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "text/html",
      body: "<!DOCTYPE html><html><body>erro interno</body></html>",
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Qual seu número de telefone?").fill("31999999999");
  await page.getByLabel(/Ao continuar, confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Receber código via SMS/ }).click();

  await expect(page.getByText("Não foi possível enviar o código agora. Tente novamente.")).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveCount(0);
});

test("após validar o código abre a ativação profissional completa", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
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
  await page.getByRole("button", { name: /Receber código via SMS/ }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Validar e continuar" }).click();

  await page.waitForURL(/\/cadastro\?tipo=acompanhante&telefoneValidado=1/);
  await expect(page.getByText("Cadastro de acompanhante +18", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar com Google" })).toBeVisible();
  await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
  await expect(page.getByText("Data de nascimento", { exact: true })).toBeVisible();
  for (const step of ["Dados", "Aparência", "Atendimento", "Serviços", "Valores", "Contato", "Fotos", "Verificação", "Enviar"]) {
    await expect(page.locator("body")).toContainText(step);
  }
});

test("cadastro profissional por email envia link e entra direto no onboarding em rascunho", async ({ page }) => {
  const captured: { signupPayload?: Record<string, unknown>; nextAuthPayload?: string | null } = {};

  await page.route("**/api/auth/email-signup", async (route) => {
    captured.signupPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        draftSessionToken: "draft-token-for-tests",
        continueTo: "/profissional/novo",
      }),
    });
  });
  await page.route("**/api/auth/csrf**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "csrf-token-for-tests" }),
    });
  });
  await page.route("**/api/auth/callback/email-signup-draft**", async (route) => {
    captured.nextAuthPayload = route.request().postData();
    const url = new URL("/profissional/novo", route.request().url()).toString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url }),
    });
  });
  await page.route("**/profissional/novo**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Criar perfil de acompanhante</h1></body></html>",
    });
  });

  await page.goto("/cadastro?tipo=acompanhante&telefoneValidado=1", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByPlaceholder("Seu nome").fill("Cadastro Profissional Teste");
  await page.getByPlaceholder("seu@email.com").fill("profissional-teste@elitemodell.local");
  await page.getByPlaceholder("Mínimo 6 caracteres").fill("senha123");
  await page.getByLabel("Dia de nascimento").fill("01");
  await page.getByLabel("Mês de nascimento").fill("01");
  await page.getByLabel("Ano de nascimento").fill("1995");
  await page.getByLabel(/Termos de Uso/).check();
  await page.getByLabel(/Política de Privacidade/).check();
  await page.getByLabel(/Confirmo que sou maior de 18 anos/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.waitForURL(/\/profissional\/novo/);
  await expect(page.getByRole("heading", { name: "Criar perfil de acompanhante" })).toBeVisible();
  expect(captured.nextAuthPayload).toContain("draft-token-for-tests");

  expect(captured.signupPayload).toMatchObject({
    accountType: "PROFESSIONAL",
    category: "MULHER",
    birthDate: "1995-01-01",
    lgpdConsent: true,
    termsConsent: true,
    ageConfirmed: true,
  });

  const redirectTo = new URL(String(captured.signupPayload?.redirectTo));
  expect(redirectTo.pathname).toBe("/auth/callback");
  expect(redirectTo.searchParams.get("role")).toBe("profissional");
  expect(redirectTo.searchParams.get("flow")).toBe("cadastro");
  expect(redirectTo.searchParams.get("intent")).toBe("professional-signup");
  expect(redirectTo.searchParams.get("returnUrl")).toBe("/profissional/novo");
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
