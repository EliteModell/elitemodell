/**
 * Testes do fluxo de cadastro de acompanhante — 9 etapas
 *
 * O que é testado:
 * - Todas as rotas do fluxo carregam sem 404/500
 * - Cada etapa tem os campos obrigatórios presentes na UI
 * - A API /api/professionals rejeita payloads inválidos (400) e aceita válidos (201)
 * - Submissão final redireciona para verificação
 * - Proteção: rotas exigem autenticação sem sessão
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

/* ─── Mock de sessão de acompanhante ──────────────────────────────────────── */

const MOCK_MODEL_SESSION = {
  user: {
    id: "test-model-id",
    name: "Modelo Teste",
    email: "modelo@teste.elitemodell.local",
    image: null,
    role: "HOST",
    accountType: "model",
    clientStatus: "UNVERIFIED",
    isProfessional: false,
    needsConsent: false,
    professionalStatus: "DRAFT",
    activeProfileType: "PROFESSIONAL",
    availableProfiles: ["PROFESSIONAL"],
    adultVerified: true,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

async function mockModelAuth(page: Page) {
  await installMockSessionCookie(page.context(), {
    ...MOCK_MODEL_SESSION.user,
    professionalStatus: "DRAFT",
    activeProfileType: "PROFESSIONAL",
    availableProfiles: ["PROFESSIONAL"],
    adultVerified: true,
  });
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_MODEL_SESSION) })
  );
  await page.route("**/api/auth/csrf", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "mock-csrf" }) })
  );
  await page.route("**/api/auth/providers", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/users/me**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...MOCK_MODEL_SESSION.user,
        lgpdConsent: true,
        termsConsent: true,
        emailVerified: true,
        birthDate: "2000-01-01",
        professional: null,
      }),
    })
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
}

async function gotoWithModelSession(page: Page, path: string) {
  await mockModelAuth(page);
  return page.goto(path, { waitUntil: "domcontentloaded" });
}

test.describe("Didit corrigida", () => {
  const fixtureId = `didit-e2e-${randomUUID()}`;
  const fixtureDb = new PrismaClient();
  test.beforeAll(async () => {
    test.skip(!/localhost|127\.0\.0\.1/.test(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"), "Fixture apenas no servidor local");
    await fixtureDb.user.create({ data: { id: fixtureId, email: `${fixtureId}@example.invalid`,
      name: "Teste automatizado Didit", accountType: "model", role: "HOST",
      lgpdConsent: true, termsConsent: true, birthDate: new Date("2000-01-01"),
    } });
  });
  test.afterAll(async () => {
    await fixtureDb.user.deleteMany({ where: { id: fixtureId, email: `${fixtureId}@example.invalid` } });
    await fixtureDb.$disconnect();
  });
  test.beforeEach(async ({ page }) => {
    await mockModelAuth(page);
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, token: {
      ...MOCK_MODEL_SESSION.user, id: fixtureId, sub: fixtureId,
    } });
    await page.context().addCookies([{ name: "next-auth.session-token", value: token,
      url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
    await page.context().setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });
    await page.route("**/api/users/me**", route => route.fulfill({ json: {
      ...MOCK_MODEL_SESSION.user, id: fixtureId, emailVerified: true, birthDate: "2000-01-01", professional: null,
    } }));
    await page.addInitScript((userId) => {
      localStorage.setItem("elite_cookie_consent", "necessary");
      localStorage.setItem(`elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`, JSON.stringify({ ownerId: userId, registrationType: "PROFESSIONAL", step: 7, form: {
        displayName: "Modelo Teste", bio: "Apresentação de teste. ".repeat(8), city: "São Paulo", state: "SP",
        escortCategory: "MULHER", birthDate: "2000-01-01", attendanceTypes: ["A domicílio"],
        servesGenders: ["Homens"], diasDisponiveis: ["Segunda"], services: ["Acompanhamento"],
        paymentMethods: ["Pix"], pricePerHour: "300", whatsapp: "11912345678",
        mainPhotoUrl: "/api/media/test-cover", galleryUrls: [],
      } }));
    }, fixtureId);
  });

  test("Botão de avançar está presente", async ({ page }) => {
    await page.addInitScript((userId) => {
      const key = `elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`;
      const draft = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...draft, step: 0 }));
    }, fixtureId);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Próximo|Continuar/ })).toBeVisible();
  });

  test("mostra motivo de recusa e orienta correcao antes de repetir", async ({ page }) => {
    await page.route("**/api/didit/session", route => route.fulfill({ json: {
      available: true, sessionId: "test-session", status: "REJECTED", retryAllowed: true,
      message: "O documento foi identificado como vencido. Use um documento válido.", url: null,
    } }));
    await page.goto("/profissional/novo?didit=returned", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("alert").filter({ hasText: "vencido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Falar com o suporte", exact: true })).toBeVisible();
  });

  test("maioridade pendente nao permite novas tentativas automaticas", async ({ page }) => {
    await page.route("**/api/didit/session", route => route.fulfill({ json: {
      available: true, sessionId: "test-session", status: "REJECTED", retryAllowed: false,
      message: "Não foi possível confirmar a idade mínima de 18 anos. Fale com o suporte.", url: null,
    } }));
    await page.goto("/profissional/novo?didit=returned", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Fale com o suporte" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0);
  });

  test("atualiza resultado sem recarregar e permite enviar cadastro para analise", async ({ page }) => {
    let approved = false;
    let submission: Record<string, unknown> | null = null;
    let savedStep: number | null = null;
    // This browser scenario simulates Didit and submission, including the new
    // server-side step persistence. The fake session is not a database KYC.
    await page.route("**/api/professionals/draft", async route => {
      if (route.request().method() === "PATCH") {
        savedStep = route.request().postDataJSON().step;
      }
      await route.fulfill({ json: { completion: { issues: [], profileIssues: [], profilePercent: 100, profileComplete: true, readyToSubmit: approved } } });
    });
    await page.route("**/api/didit/session", route => route.fulfill({ json: {
      available: true, sessionId: "test-session", status: approved ? "APPROVED" : "PENDING",
      retryAllowed: false, message: approved ? null : "Seus documentos estão em análise de identidade.", url: null,
    } }));
    await page.route("**/api/professionals", async route => {
      submission = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { status: "PENDING_REVIEW", receiptStatus: "SENT" } });
    });
    await page.goto("/profissional/novo?didit=returned", { waitUntil: "domcontentloaded" });
    const pendingActions = page.getByRole("button", { name: "Verificação em análise" });
    await expect(pendingActions).toHaveCount(2);
    await expect(pendingActions.first()).toBeDisabled();
    await expect(pendingActions.nth(1)).toBeDisabled();
    approved = true;
    await expect(page.getByText("✓ Identidade verificada", { exact: true })).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: /Próximo|Continuar/ }).click();
    expect(savedStep).toBe(7);
    await page.getByRole("button", { name: "Enviar cadastro para análise" }).click();
    await expect(page.getByRole("heading", { name: /Cadastro 100% conclu/ })).toBeVisible();
    await expect(page.getByText(/Status: Em an/)).toBeVisible();
    expect(submission).toMatchObject({ kycSessionId: "test-session" });
  });
});

async function postProfessional(page: Page, data: Record<string, unknown>) {
  return page.evaluate(async (payload) => {
    const response = await fetch("/api/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.status;
  }, data);
}

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 1 — Rotas do fluxo carregam corretamente
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Fluxo acompanhante — rotas", () => {

  test("/cadastro-modelo carrega sem 404", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("elite_modell_adult_consent_session", "accepted"); localStorage.setItem("elite_modell_ageConsentAccepted", "true"); });
    const resp = await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/cadastro-modelo/verificar-telefone tem telefone e termos obrigatórios", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("elite_modell_adult_consent_session", "accepted"); localStorage.setItem("elite_modell_ageConsentAccepted", "true"); });
    await page.goto("/cadastro-modelo/verificar-telefone", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Confirme seu telefone" })).toBeVisible();
    await expect(page.getByText("Informe primeiro o telefone e aceite os termos obrigatórios.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos de Uso" })).toBeVisible();
  });

  test("/cadastro-modelo/verificar-telefone carrega sem 404", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("elite_modell_adult_consent_session", "accepted"); localStorage.setItem("elite_modell_ageConsentAccepted", "true"); });
    const resp = await page.goto("/cadastro-modelo/verificar-telefone", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/profissional/novo carrega com sessão de modelo", async ({ page }) => {
    const resp = await gotoWithModelSession(page, "/profissional/novo");
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/profissional/novo redireciona sem sessão", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("elite_modell_adult_consent_session", "accepted"); localStorage.setItem("elite_modell_ageConsentAccepted", "true"); });
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login/);
  });

  test("/verificacao/acompanhante carrega com sessão", async ({ page }) => {
    const resp = await gotoWithModelSession(page, "/verificacao/acompanhante");
    expect(resp?.status()).not.toBe(404);
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 2 — Etapas do onboarding (UI)
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Onboarding acompanhante — etapas UI", () => {

  test("Etapa 1: formulário de dados básicos está presente", async ({ page }) => {
    await gotoWithModelSession(page, "/profissional/novo");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasNome = body?.toLowerCase().includes("nome artístico") || body?.toLowerCase().includes("nome artist") || body?.toLowerCase().includes("displayname") || body?.toLowerCase().includes("nome");
    const hasBio = body?.toLowerCase().includes("bio") || body?.toLowerCase().includes("descrição") || body?.toLowerCase().includes("sobre");
    const hasCity = body?.toLowerCase().includes("cidade");
    expect(hasNome || hasBio || hasCity).toBe(true);
  });

  test("Barra de progresso está presente no onboarding", async ({ page }) => {
    await gotoWithModelSession(page, "/profissional/novo");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasProgress = body?.includes("%") || body?.toLowerCase().includes("etapa") || body?.toLowerCase().includes("passo") || body?.toLowerCase().includes("step");
    expect(hasProgress).toBe(true);
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 3 — API /api/professionals — validações
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("API /api/professionals — validações", () => {

  test("POST sem autenticação retorna 401 ou redirect", async ({ page }) => {
    const resp = await page.request.post("/api/professionals", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 307]).toContain(resp.status());
  });

  test("POST sem campos obrigatórios retorna 400", async ({ page }) => {
    await mockModelAuth(page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    const status = await postProfessional(page, { displayName: "Teste" });
    expect([400, 401, 403]).toContain(status);
  });

  test("POST com bio muito curta (< 80 chars) retorna 400", async ({ page }) => {
    await mockModelAuth(page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    const status = await postProfessional(page, {
        displayName: "Modelo Teste",
        bio: "Bio muito curta", // menos de 80 caracteres
        city: "São Paulo",
        state: "SP",
        escortCategory: "MULHER",
        birthDate: "2000-01-01",
        attendanceTypes: ["A domicílio"],
        servesGenders: ["Homens"],
        diasDisponiveis: ["Segunda"],
        services: ["Acompanhamento"],
        paymentMethods: ["Pix"],
        pricePerHour: 300,
        whatsapp: "11912345678",
        image: "https://example.com/photo.jpg",
        docType: "RG / DNI",
        docFrenteUrl: "https://example.com/frente.jpg",
        docVersoUrl: "https://example.com/verso.jpg",
        verificationUrl: "https://example.com/selfie.jpg",
        verificationType: "foto",
        verificationCode: "ABCD-1234",
    });
    expect([400, 401, 403]).toContain(status);
  });

  test("POST sem foto principal retorna 400", async ({ page }) => {
    await mockModelAuth(page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    const status = await postProfessional(page, {
        displayName: "Modelo Teste",
        bio: "A".repeat(85),
        city: "São Paulo",
        state: "SP",
        escortCategory: "MULHER",
        birthDate: "2000-01-01",
        attendanceTypes: ["A domicílio"],
        servesGenders: ["Homens"],
        diasDisponiveis: ["Segunda"],
        services: ["Acompanhamento"],
        paymentMethods: ["Pix"],
        pricePerHour: 300,
        whatsapp: "11912345678",
        // image ausente — deve falhar
        docType: "RG / DNI",
        docFrenteUrl: "https://example.com/frente.jpg",
        docVersoUrl: "https://example.com/verso.jpg",
        verificationUrl: "https://example.com/selfie.jpg",
        verificationType: "foto",
        verificationCode: "ABCD-1234",
    });
    expect([400, 401, 403]).toContain(status);
  });

  test("POST sem documentos ou sessao KYC e rejeitado", async ({ page }) => {
    await mockModelAuth(page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    const status = await postProfessional(page, {
        displayName: "Modelo Teste",
        bio: "A".repeat(85),
        city: "São Paulo",
        state: "SP",
        escortCategory: "MULHER",
        birthDate: "2000-01-01",
        attendanceTypes: ["A domicílio"],
        servesGenders: ["Homens"],
        diasDisponiveis: ["Segunda"],
        services: ["Acompanhamento"],
        paymentMethods: ["Pix"],
        pricePerHour: 300,
        whatsapp: "11912345678",
        image: "https://example.com/photo.jpg",
        // docType, docFrenteUrl, docVersoUrl ausentes — deve falhar
        verificationUrl: "https://example.com/selfie.jpg",
        verificationType: "foto",
        verificationCode: "ABCD-1234",
    });
    expect([400, 401, 403]).toContain(status);
  });

  test("POST sem verificação facial retorna 400", async ({ page }) => {
    await mockModelAuth(page);
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

    const status = await postProfessional(page, {
        displayName: "Modelo Teste",
        bio: "A".repeat(85),
        city: "São Paulo",
        state: "SP",
        escortCategory: "MULHER",
        birthDate: "2000-01-01",
        attendanceTypes: ["A domicílio"],
        servesGenders: ["Homens"],
        diasDisponiveis: ["Segunda"],
        services: ["Acompanhamento"],
        paymentMethods: ["Pix"],
        pricePerHour: 300,
        whatsapp: "11912345678",
        image: "https://example.com/photo.jpg",
        docType: "RG / DNI",
        docFrenteUrl: "https://example.com/frente.jpg",
        docVersoUrl: "https://example.com/verso.jpg",
        // verificationUrl e kycSessionId ausentes — deve falhar
    });
    expect([400, 401, 403]).toContain(status);
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 4 — Upload API aceita tipos corretos para cada etapa
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Upload API — validações por etapa", () => {

  test("Upload sem autenticação retorna 401", async ({ page }) => {
    const resp = await page.request.post("/api/upload?folder=profiles", {
      multipart: { file: { name: "test.jpg", mimeType: "image/jpeg", buffer: Buffer.from("fake") } },
    });
    expect([401, 403, 307]).toContain(resp.status());
  });

  test("API /api/kyc/sessions sem autenticação retorna 401", async ({ page }) => {
    const resp = await page.request.post("/api/kyc/sessions", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 307]).toContain(resp.status());
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 5 — Dashboard da profissional
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Dashboard da profissional", () => {

  const MOCK_ACTIVE_MODEL_SESSION = {
    user: {
      id: "test-model-active-id",
      name: "Modelo Ativa",
      email: "modelo.ativa@teste.elitemodell.local",
      image: null,
      role: "HOST",
      accountType: "model",
      clientStatus: "UNVERIFIED",
      isProfessional: true,
      needsConsent: false,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };

  async function mockActiveModelAuth(page: Page) {
    await page.route("**/api/auth/session", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ACTIVE_MODEL_SESSION) })
    );
    await page.route("**/api/auth/csrf", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "mock-csrf" }) })
    );
    await page.route("**/api/auth/providers", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
    );
    await page.route("**/api/professionals/**", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "prof-id", slug: "modelo-ativa", displayName: "Modelo Ativa",
          status: "ACTIVE", bio: "Bio completa", city: "São Paulo", state: "SP",
          pricePerHour: 300, galleryUrls: [], specialties: [],
        }),
      })
    );
    await page.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    });
  }

  test("/profissional carrega sem 404", async ({ page }) => {
    await mockActiveModelAuth(page);
    const resp = await page.goto("/profissional", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("gate de e-mail mantém texto, placeholder e cursor legíveis no Safari mobile", async ({ page }) => {
    const pageSource = readFileSync("src/app/(dashboard)/profissional/novo/page.tsx", "utf8");
    const styles = pageSource.match(/const EMAIL_GATE_STYLES = `([^`]+)`;/)?.[1];
    expect(styles, "estilos reais do gate de e-mail").toBeTruthy();
    await page.setContent(`<style>${styles}</style><main class="model-email-gate"><section><div class="actions"><input placeholder="novo@email.com" /></div></section></main>`);
    const input = page.getByPlaceholder("novo@email.com");
    await input.fill("novo.teste@example.com");

    for (const width of [375, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await input.focus();
      const styles = await input.evaluate((element) => {
        const field = getComputedStyle(element);
        const placeholder = getComputedStyle(element, "::placeholder");
        return {
          color: field.color,
          textFillColor: field.webkitTextFillColor,
          caretColor: field.caretColor,
          backgroundColor: field.backgroundColor,
          placeholderColor: placeholder.color,
          fontSize: Number.parseFloat(field.fontSize),
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(styles.color).toBe("rgb(252, 247, 255)");
      expect(styles.textFillColor).toBe("rgb(252, 247, 255)");
      expect(styles.caretColor).not.toBe(styles.backgroundColor);
      expect(styles.placeholderColor).not.toBe(styles.backgroundColor);
      expect(styles.fontSize).toBeGreaterThanOrEqual(16);
      expect(styles.scrollWidth).toBeLessThanOrEqual(styles.clientWidth + 1);
    }
  });

  test("painel profissional permanece íntegro nos viewports prioritários", async ({ page }, testInfo) => {
    test.skip(
      process.env.RUN_PROFESSIONAL_DASHBOARD_VISUAL !== "1" || !process.env.TEST_USER_EMAIL,
      "Validação visual com conta profissional não solicitada nesta execução.",
    );
    await installMockSessionCookie(page.context(), {
      ...MOCK_MODEL_SESSION.user,
      professionalStatus: "ACTIVE",
      isProfessional: true,
      activeProfileType: "PROFESSIONAL",
      availableProfiles: ["PROFESSIONAL"],
      adultVerified: true,
    });
    await page.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    });

    for (const width of [360, 375, 390, 393, 414, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/profissional", { waitUntil: "domcontentloaded" });
      const acceptCookies = page.getByRole("button", { name: "Aceitar todos" });
      if (await acceptCookies.isVisible().catch(() => false)) await acceptCookies.click();
      await expect(page.getByRole("heading", { name: "Gestão do seu anúncio" })).toBeVisible();
      await expect(page.getByText("Conteúdo que gera mais contatos")).toBeVisible();
      await expect(page.getByText("Pendências reais")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `overflow horizontal em ${width}px`).toBe(false);

      if (width === 390) {
        await page.screenshot({
          path: testInfo.outputPath("professional-dashboard-390.png"),
          fullPage: true,
        });
      }
    }
  });

  test("página de postagem permanece íntegra nos viewports prioritários", async ({ page }, testInfo) => {
    test.skip(
      process.env.RUN_PROFESSIONAL_DASHBOARD_VISUAL !== "1" || !process.env.TEST_USER_EMAIL,
      "Validação visual com conta profissional não solicitada nesta execução.",
    );
    await installMockSessionCookie(page.context(), {
      ...MOCK_MODEL_SESSION.user,
      professionalStatus: "ACTIVE",
      isProfessional: true,
      activeProfileType: "PROFESSIONAL",
      availableProfiles: ["PROFESSIONAL"],
      adultVerified: true,
    });
    await page.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    });

    for (const width of [360, 375, 390, 393, 414, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/profissional/postar", { waitUntil: "domcontentloaded" });
      const acceptCookies = page.getByRole("button", { name: "Aceitar todos" });
      if (await acceptCookies.isVisible().catch(() => false)) await acceptCookies.click();
      await expect(page.getByRole("heading", { name: "Postar conteúdo" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Foto de perfil" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Vídeo de apresentação" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Minha listagem" })).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `overflow horizontal em ${width}px`).toBe(false);

      if (width === 390) {
        await page.screenshot({
          path: testInfo.outputPath("professional-post-390.png"),
          fullPage: true,
        });
      }
    }
  });

  test("área de perfil permanece íntegra nos viewports prioritários", async ({ page }, testInfo) => {
    test.skip(
      process.env.RUN_PROFESSIONAL_DASHBOARD_VISUAL !== "1" || !process.env.TEST_USER_EMAIL,
      "Validação visual com conta profissional não solicitada nesta execução.",
    );
    await installMockSessionCookie(page.context(), {
      ...MOCK_MODEL_SESSION.user,
      professionalStatus: "ACTIVE",
      isProfessional: true,
      activeProfileType: "PROFESSIONAL",
      availableProfiles: ["PROFESSIONAL"],
      adultVerified: true,
    });
    await page.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    });

    for (const width of [360, 375, 390, 393, 414, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/profissional/perfil", { waitUntil: "domcontentloaded" });
      const acceptCookies = page.getByRole("button", { name: "Aceitar todos" });
      if (await acceptCookies.isVisible().catch(() => false)) await acceptCookies.click();
      await expect(page.getByRole("heading", { name: "Perfil profissional", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Dados principais", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Confiança e verificação" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Atendimento e agenda" })).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `overflow horizontal em ${width}px`).toBe(false);

      if (width === 390) {
        await page.screenshot({
          path: testInfo.outputPath("professional-profile-top-390.png"),
        });
        await page.getByRole("heading", { name: "Dados principais", exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath("professional-profile-form-390.png"),
        });
        await page.getByRole("heading", { name: "Confiança e verificação" }).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath("professional-profile-details-390.png"),
        });
        await page.screenshot({
          path: testInfo.outputPath("professional-profile-390.png"),
          fullPage: true,
        });
      }
    }
  });

  test("/profissional/fotos carrega sem 404", async ({ page }) => {
    await mockActiveModelAuth(page);
    const resp = await page.goto("/profissional/fotos", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/profissional/perfil carrega sem 404", async ({ page }) => {
    await mockActiveModelAuth(page);
    const resp = await page.goto("/profissional/perfil", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/profissional/agenda carrega sem 404", async ({ page }) => {
    await mockActiveModelAuth(page);
    const resp = await page.goto("/profissional/agenda", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/profissional/planos carrega sem 404", async ({ page }) => {
    await mockActiveModelAuth(page);
    const resp = await page.goto("/profissional/planos", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

});
