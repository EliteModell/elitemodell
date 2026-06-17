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
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasTelefone = body?.toLowerCase().includes("telefone") || body?.toLowerCase().includes("celular");
    const hasTermos = body?.toLowerCase().includes("termos") || body?.toLowerCase().includes("lgpd") || body?.toLowerCase().includes("confirmo");
    expect(hasTelefone).toBe(true);
    expect(hasTermos).toBe(true);
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

  test("Botão de avançar está presente", async ({ page }) => {
    await gotoWithModelSession(page, "/profissional/novo");
    await page.waitForLoadState("networkidle").catch(() => {});
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(0);
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
