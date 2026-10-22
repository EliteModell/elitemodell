import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

const USER_ID = "visual-onboarding-user";
const stages = ["Dados", "Aparência", "Atendimento", "Serviços", "Valores", "Contato", "Fotos", "Verificação", "Enviar"];

const completeForm = {
  displayName: "Marina Teste Visual",
  bio: "Biografia inteiramente fictícia usada apenas no teste automatizado e isolado do cadastro profissional.",
  city: "São Paulo",
  state: "SP",
  escortCategory: "MULHER",
  birthDate: "2000-01-01",
  attendanceTypes: ["A domicílio"],
  servesGenders: ["Homens"],
  diasDisponiveis: ["Segunda"],
  services: ["Acompanhamento"],
  pricePerHour: "300",
  paymentMethods: ["Pix"],
  whatsapp: "11912345678",
  mainPhotoUrl: "/api/media/visual-cover",
  galleryUrls: [],
  kycProvider: "didit",
  kycSessionId: "didit-visual-session",
  kycStatus: "PENDING",
};

async function mockCompleteOnboarding(context: BrowserContext, page: Page) {
  await installMockSessionCookie(context, {
    id: USER_ID,
    name: "Profissional Visual",
    email: "visual-onboarding@example.invalid",
    role: "HOST",
    accountType: "model",
    isProfessional: true,
    professionalStatus: "DRAFT",
    activeProfileType: "PROFESSIONAL",
    availableProfiles: ["PROFESSIONAL"],
    adultVerified: true,
  }, { persistedProfessionalStatus: "DRAFT" });
  await page.addInitScript(({ userId, form }) => {
    localStorage.setItem("elite_cookie_consent", "necessary");
    localStorage.setItem("elitemodell_ageConsentAccepted", "true");
    const key = `elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        ownerId: userId,
        registrationType: "PROFESSIONAL",
        draftVersion: 3,
        updatedAt: "2099-01-01T00:00:00.000Z",
        step: 0,
        form,
      }));
    }
  }, { userId: USER_ID, form: completeForm });
  await page.route("**/api/users/me/activate-professional", route => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/address/search**", route => route.fulfill({ json: { results: [] } }));
  await page.route("**/api/users/me**", route => route.fulfill({ json: {
    id: USER_ID,
    email: "visual-onboarding@example.invalid",
    emailVerified: true,
    birthDate: "2000-01-01",
    lgpdConsent: true,
    termsConsent: true,
    professional: { id: "professional-visual", slug: "marina-teste-visual", status: "DRAFT", completionRulesVersion: 2 },
  } }));
  await page.route("**/api/upload?folder=profile-videos/**", route => route.fulfill({ status: 202, json: {
    url: "/api/media/visual-video", assetId: "visual-video", status: "QUARANTINED",
  } }));
  await page.route("**/api/professionals/draft", route => route.fulfill({ json: {
    completion: { issues: [], profileIssues: [], profilePercent: 100, profileComplete: true, readyToSubmit: false },
  } }));
  await page.route("**/api/didit/session", route => route.fulfill({ json: {
    available: true,
    sessionId: "didit-visual-session",
    status: "PENDING",
    retryAllowed: false,
    message: "Seus documentos estão em análise de identidade.",
    url: null,
  } }));
  await page.route("**/api/professionals", route => route.fulfill({ status: 201, json: {
    status: "DRAFT",
    receiptStatus: "SENT",
    identityPending: true,
    identityStatus: "PENDING",
    publication: { published: false, blockers: [{ code: "kyc", label: "A verificação de identidade e maioridade ainda não foi aprovada." }] },
  } }));
}

const devices = [
  { name: "iphone-14-pro-max-safari-simulado", viewport: { width: 430, height: 932 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1", hasTouch: true, isMobile: true },
  { name: "android-chrome-simulado", viewport: { width: 412, height: 915 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36", hasTouch: true, isMobile: true },
  { name: "desktop-chrome", viewport: { width: 1440, height: 1000 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", hasTouch: false, isMobile: false },
];

for (const device of devices) {
  test(`${device.name}: percorre, persiste e registra visualmente as nove etapas`, async ({ browser }, testInfo) => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
    page.on("console", message => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
    page.on("requestfailed", request => errors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`));
    await mockCompleteOnboarding(context, page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    for (let index = 0; index < stages.length; index += 1) {
      await expect(page.getByText(`Etapa ${index + 1} de 9`, { exact: false })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(device.viewport.width + 1);
      await page.screenshot({ path: testInfo.outputPath(`${device.name}-etapa-${index + 1}.png`), fullPage: true });
      if (index === 6) {
        await expect(page.getByText("Vídeo de apresentação", { exact: true })).toBeVisible();
        if (device.name === "iphone-14-pro-max-safari-simulado") {
          await page.locator('input[accept*="video/mp4"]').first().setInputFiles({
            name: "apresentacao-teste.mp4", mimeType: "video/mp4", buffer: Buffer.from("video-ficticio-controlado"),
          });
          await expect(page.locator("video").first()).toBeVisible();
          await expect(page.getByText("Vídeo recebido e encaminhado para as verificações de segurança.", { exact: true })).toBeVisible();
        }
      }
      if (index === 2) {
        await page.getByRole("button", { name: "← Voltar", exact: true }).click();
        await expect(page.getByText("Etapa 2 de 9", { exact: false })).toBeVisible();
        await page.getByRole("button", { name: /Continuar/ }).click();
      }
      if (index < stages.length - 1) {
        await page.getByRole("button", { name: /Continuar/ }).click();
        await expect(page.getByText(`Etapa ${index + 2} de 9`, { exact: false })).toBeVisible();
        await expect.poll(() => page.evaluate((userId) => {
          const raw = localStorage.getItem(`elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`);
          return raw ? JSON.parse(raw).step : null;
        }, USER_ID)).toBe(index + 1);
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }

    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await expect(page.getByRole("heading", { name: "Cadastro recebido com sucesso!" })).toBeVisible();
    await expect(page.getByText("Verificações em andamento", { exact: true })).toBeVisible();
    await testInfo.attach("erros-console-rede.json", { body: Buffer.from(JSON.stringify(errors, null, 2)), contentType: "application/json" });
    expect(errors).toEqual([]);
    await context.close();
  });
}
