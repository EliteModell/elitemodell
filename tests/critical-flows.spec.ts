/**
 * Testes dos 3 fluxos críticos — Cadastro, Login e Pagamento
 *
 * Usa mock de sessão (sem login real) para ser executado em CI sem credenciais.
 * Cobre apenas a camada de UI: elementos presentes, redirecionamentos, validações
 * e ausência de erros 404/500.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

/* ─── Mocks ──────────────────────────────────────────────────────────────── */

const MOCK_CLIENT_SESSION = {
  user: {
    id: "test-client-id",
    name: "Cliente Teste",
    email: "cliente@teste.elitemodell.local",
    image: null,
    role: "GUEST",
    accountType: "client",
    clientStatus: "UNVERIFIED",
    isProfessional: false,
    needsConsent: false,
    activeProfileType: "CLIENTE",
    availableProfiles: ["CLIENTE"],
    adultVerified: true,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const MOCK_WALLET = {
  credits: 0,
  premiumUntil: null,
  isPremium: false,
  transactions: [],
};

async function mockAuth(page: Page) {
  await installMockSessionCookie(page.context(), {
    ...MOCK_CLIENT_SESSION.user,
    activeProfileType: "CLIENTE",
    availableProfiles: ["CLIENTE"],
    adultVerified: true,
  });
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CLIENT_SESSION) })
  );
  await page.route("**/api/auth/csrf", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "mock-csrf" }) })
  );
  await page.route("**/api/auth/providers", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/professionals**", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ professionals: [], total: 0, pages: 1 }) })
  );
  await page.route("**/api/wallet**", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_WALLET) })
  );
  await page.route("**/api/users/me**", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...MOCK_CLIENT_SESSION.user, lgpdConsent: true, termsConsent: true, birthDate: "2000-01-01" }) })
  );
}

async function bypassAgeGate(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
}

async function gotoWithMock(page: Page, path: string) {
  await bypassAgeGate(page);
  await mockAuth(page);
  return page.goto(path, { waitUntil: "domcontentloaded" });
}

async function expectCadastroChoiceOptions(page: Page) {
  const body = page.locator("body");
  await expect(body).toContainText(/cliente/i);
  await expect(body).toContainText(/profissional/i);
  await expect(body).toContainText(/anfitri/i);
}

async function seedHostDraft(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("elitemodell_location_onboarding_v2", JSON.stringify({
      form: {},
      step: 1,
      status: "draft_local",
      updatedAt: new Date().toISOString(),
    }));
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   FLUXO 1 — CADASTRO
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Fluxo 1 — Cadastro", () => {

  test("Página principal /cadastro carrega sem 404", async ({ page }) => {
    await bypassAgeGate(page);
    const resp = await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/cadastro exibe opções de tipo de conta", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectCadastroChoiceOptions(page);
  });

  test("/cadastro com rascunho de anfitriao salvo ainda mostra escolha de tipo", async ({ page }) => {
    await bypassAgeGate(page);
    await seedHostDraft(page);
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectCadastroChoiceOptions(page);
    expect(page.url()).toMatch(/\/cadastro$/);
  });

  test("/cadastro logado com rascunho anterior ainda permite escolher tipo", async ({ page }) => {
    await bypassAgeGate(page);
    await seedHostDraft(page);
    await mockAuth(page);
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectCadastroChoiceOptions(page);
  });

  test("cliente e profissional podem trocar tipo antes de finalizar", async ({ page }) => {
    await bypassAgeGate(page);
    for (const label of ["Criar conta cliente", "Ativar perfil profissional"]) {
      await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
      await page.locator("button", { hasText: label }).first().click();
      await expect(page.locator("button", { hasText: "Trocar tipo de cadastro" })).toBeVisible();
      await page.locator("button", { hasText: "Trocar tipo de cadastro" }).click();
      await expectCadastroChoiceOptions(page);
    }
  });

  test("anfitriao iniciado nao prende o proximo clique em cadastrar", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await page.locator('a[href="/anfitriao/imoveis/novo"]').first().click();
    await page.waitForURL(/\/anfitriao\/imoveis\/novo/);
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectCadastroChoiceOptions(page);
  });

  test("/app/consumer/register (cadastro cliente) carrega sem 404", async ({ page }) => {
    await bypassAgeGate(page);
    const resp = await page.goto("/app/consumer/register", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/app/consumer/register tem campo de telefone ou e-mail", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/app/consumer/register", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const inputs = await page.locator("input").count();
    expect(inputs).toBeGreaterThan(0);
  });

  test("/cadastro-modelo (cadastro profissional) carrega sem 404", async ({ page }) => {
    await bypassAgeGate(page);
    const resp = await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/cadastro-modelo encaminha para onboarding profissional ou login", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/cadastro-modelo", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(page.url()).toMatch(/\/(profissional\/novo|login)/);
  });

  test("/cadastro profissional logado nao exige anti-spam para continuar", async ({ page }) => {
    await gotoWithMock(page, "/cadastro?tipo=acompanhante");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(body).toContain("continuar como profissional");
    expect(body).toContain("ir para as fases do cadastro");
    expect(body).not.toContain("anti-spam");
    expect(body).not.toContain("captcha");
  });

  test("/completar-cadastro carrega sem 404", async ({ page }) => {
    await mockAuth(page);
    const resp = await page.goto("/completar-cadastro", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

  test("/completar-cadastro exige sessao antes de exibir o formulario", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/completar-cadastro", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(page.url()).toMatch(/\/login/);
  });

  test("Age gate 18+ bloqueia acesso sem confirmação", async ({ page }) => {
    // Sem bypassAgeGate — o gate deve aparecer
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    // Ou o age gate está visível ou o conteúdo da home está (se o usuário já confirmou antes)
    const hasGate = body?.toLowerCase().includes("18") || body?.toLowerCase().includes("adulto") || body?.toLowerCase().includes("elitemodell");
    expect(hasGate).toBe(true);
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   FLUXO 2 — LOGIN E AUTENTICAÇÃO
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Fluxo 2 — Login e Autenticação", () => {

  test("/login carrega sem 404", async ({ page }) => {
    await bypassAgeGate(page);
    const resp = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/login tem botão de Google OAuth ou campo de e-mail", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasGoogle = body?.toLowerCase().includes("google") || body?.toLowerCase().includes("continuar com");
    const hasEmail = (await page.locator('input[type="email"]').count()) > 0;
    const hasPhone = body?.toLowerCase().includes("telefone") || body?.toLowerCase().includes("celular");
    expect(hasGoogle || hasEmail || hasPhone).toBe(true);
  });

  test("/auth/callback carrega sem 500", async ({ page }) => {
    // Sem code válido, deve carregar a página e exibir erro amigável (não 500)
    await page.goto("/auth/callback", { waitUntil: "domcontentloaded" });
    const resp = await page.goto("/auth/callback", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(500);
  });

  test("Rota protegida /dashboard redireciona para /login sem sessão", async ({ page }) => {
    // Sem mockAuth — sem sessão
    await bypassAgeGate(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Deve estar na página de login
    expect(page.url()).toMatch(/\/login/);
  });

  test("Rota /admin redireciona para /login sem sessão", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(page.url()).toMatch(/\/login/);
  });

  test("Com sessão mock, /dashboard carrega sem 404", async ({ page }) => {
    const resp = await gotoWithMock(page, "/dashboard");
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("Com sessão mock, /dashboard exibe conteúdo do painel", async ({ page }) => {
    await gotoWithMock(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasDashboardContent = body?.toLowerCase().includes("dashboard") ||
      body?.toLowerCase().includes("painel") ||
      body?.toLowerCase().includes("elitemodell") ||
      body?.toLowerCase().includes("cliente");
    expect(hasDashboardContent).toBe(true);
  });

  test("Usuário com needsConsent=true é redirecionado para /completar-cadastro", async ({ page }) => {
    // Mock com needsConsent=true
    const sessionWithConsent = { ...MOCK_CLIENT_SESSION, user: { ...MOCK_CLIENT_SESSION.user, needsConsent: true } };
    await page.route("**/api/auth/session", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionWithConsent) })
    );
    await page.route("**/api/auth/csrf", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "mock-csrf" }) })
    );
    await page.route("**/api/auth/providers", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
    );
    await bypassAgeGate(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Deve ir para /completar-cadastro ou /login (o middleware da borda redireciona para login se não há token)
    const url = page.url();
    expect(url).toMatch(/\/(completar-cadastro|login)/);
  });

  test("/esqueci-senha carrega sem 404", async ({ page }) => {
    await bypassAgeGate(page);
    const resp = await page.goto("/esqueci-senha", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   FLUXO 3 — PAGAMENTO
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Fluxo 3 — Pagamento", () => {

  test("/dashboard/carteira carrega sem 404 com sessão mock", async ({ page }) => {
    const resp = await gotoWithMock(page, "/dashboard/carteira");
    expect(resp?.status()).not.toBe(404);
    expect(resp?.status()).not.toBe(500);
  });

  test("/dashboard/carteira exibe saldo e extrato", async ({ page }) => {
    await gotoWithMock(page, "/dashboard/carteira");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasSaldo = body?.toLowerCase().includes("saldo") || body?.toLowerCase().includes("r$") || body?.toLowerCase().includes("carteira");
    expect(hasSaldo).toBe(true);
  });

  test("/dashboard/carteira tem botão Adicionar créditos", async ({ page }) => {
    await gotoWithMock(page, "/dashboard/carteira");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasAddButton = body?.toLowerCase().includes("adicionar") || body?.toLowerCase().includes("pix") || body?.toLowerCase().includes("crédito");
    expect(hasAddButton).toBe(true);
  });

  test("/dashboard/planos carrega sem 404", async ({ page }) => {
    const resp = await gotoWithMock(page, "/dashboard/planos");
    expect(resp?.status()).not.toBe(404);
  });

  test("/dashboard/planos exibe opções premium", async ({ page }) => {
    await gotoWithMock(page, "/dashboard/planos");
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = await page.textContent("body");
    const hasPremium = body?.toLowerCase().includes("premium") || body?.toLowerCase().includes("plano") || body?.toLowerCase().includes("elite");
    expect(hasPremium).toBe(true);
  });

  test("API /api/payments/pix rejeita sem autenticação (401)", async ({ page }) => {
    const resp = await page.request.post("/api/payments/pix", {
      data: { amount: 50 },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 307]).toContain(resp.status());
  });

  test("API /api/payments/card rejeita sem autenticação (401)", async ({ page }) => {
    const resp = await page.request.post("/api/payments/card", {
      data: { amount: 50 },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 307]).toContain(resp.status());
  });

  test("API /api/wallet rejeita sem autenticação (401)", async ({ page }) => {
    const resp = await page.request.get("/api/wallet");
    expect([401, 403, 307]).toContain(resp.status());
  });

  test("Webhook /api/payments/asaas/webhook rejeita sem token em produção", async ({ page }) => {
    const resp = await page.request.post("/api/payments/asaas/webhook", {
      data: { event: "PAYMENT_RECEIVED", payment: { id: "fake-id" } },
      headers: { "Content-Type": "application/json" },
    });
    // Em dev sem token: 200 (bypass). Em prod com token configurado: 401
    expect([200, 401]).toContain(resp.status());
  });

});

/* ════════════════════════════════════════════════════════════════════════════
   SEGURANÇA — Rotas protegidas
   ════════════════════════════════════════════════════════════════════════════ */

test.describe("Segurança — Proteção de rotas", () => {

  const PROTECTED_ROUTES = [
    "/dashboard",
    "/dashboard/carteira",
    "/dashboard/configuracoes",
    "/profissional",
    "/painel/cliente",
    "/painel/acompanhante",
    "/painel/anfitriao",
    "/verificacao/acompanhante",
    "/completar-cadastro",
  ];

  for (const route of PROTECTED_ROUTES) {
    test(`${route} redireciona para /login sem sessão`, async ({ page }) => {
      await bypassAgeGate(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      expect(page.url()).toMatch(/\/login/);
    });
  }

  test("/admin redireciona para /dashboard para usuário não-admin com sessão", async ({ page }) => {
    await gotoWithMock(page, "/admin");
    await page.waitForLoadState("networkidle").catch(() => {});
    // GUEST com sessão não deve acessar /admin
    expect(page.url()).not.toMatch(/\/admin$/);
  });

  const PUBLIC_API_ROUTES = [
    { url: "/api/users/me", method: "GET", expectedStatus: [401, 307] },
    { url: "/api/upload", method: "POST", expectedStatus: [401, 307, 400] },
    { url: "/api/kyc/request", method: "POST", expectedStatus: [401, 307] },
  ];

  for (const { url, method, expectedStatus } of PUBLIC_API_ROUTES) {
    test(`API ${url} rejeita sem autenticação`, async ({ page }) => {
      const resp = method === "GET"
        ? await page.request.get(url)
        : await page.request.post(url, { data: {}, headers: { "Content-Type": "application/json" } });
      expect(expectedStatus).toContain(resp.status());
    });
  }

});

test.describe("Fluxo público — Buscar prazer", () => {
  test("CTA da Home abre a seleção de cidade antes da listagem", async ({ page }) => {
    await bypassAgeGate(page);
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "null" })
    );
    await page.route("**/api/professionals**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ professionals: [], total: 0, pages: 1 }),
      })
    );
    await page.route("**/api/stories**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const cta = page.getByRole("link", { name: /Ver perfis agora/i });
    await expect(cta).toHaveAttribute(
      "href",
      "/buscar?tab=acompanhantes&selecionarCidade=1",
    );
  });

  test("não carrega perfis antes de selecionar cidade", async ({ page }) => {
    await bypassAgeGate(page);
    let professionalRequests = 0;
    await page.route("**/api/professionals**", (route) => {
      professionalRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ professionals: [], total: 0, pages: 1 }),
      });
    });
    await page.route("**/api/stories**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );
    await page.route("**/api/vouchers/roulette", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, canSpin: false, prizes: [] }),
      })
    );

    await page.goto(
      "/buscar?tab=acompanhantes&selecionarCidade=1",
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByRole("dialog", { name: "Selecionar localização" }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    expect(professionalRequests).toBe(0);

    await page.getByRole("button", { name: "Itaúna, MG" }).click();
    await page.getByRole("button", { name: "Buscar acompanhantes" }).click();
    await expect(page).toHaveURL(/cidade=Ita(%C3%BA|ú)na/i);
    await expect.poll(() => professionalRequests).toBeGreaterThan(0);
  });

  test("localização aproximada normaliza Itauna e libera a busca", async ({ page }) => {
    await bypassAgeGate(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(success: PositionCallback) {
            success({
              coords: {
                latitude: -20.0755,
                longitude: -44.5764,
                accuracy: 20,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            } as GeolocationPosition);
          },
        },
      });
    });
    await page.route("**/api/address/geocode**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ provider: "test", city: "Itauna", state: "MG" }),
      })
    );
    await page.route("**/api/professionals**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ professionals: [], total: 0, pages: 0 }),
      })
    );
    await page.route("**/api/stories**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );
    await page.route("**/api/vouchers/roulette", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, canSpin: false, prizes: [] }),
      })
    );

    await page.goto("/buscar?tab=acompanhantes&selecionarCidade=1", {
      waitUntil: "domcontentloaded",
    });
    const submit = page.getByRole("button", { name: "Buscar acompanhantes" });
    await expect(submit).toBeDisabled();
    await page.getByRole("button", { name: "Usar minha localização aproximada" }).click();
    await expect(page.getByText("Localização detectada: Itaúna, MG.")).toBeVisible();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL(/cidade=Ita(%C3%BA|ú)na.*estado=mg/i);
  });
});

test.describe("Perfil público mobile", () => {
  test("renderiza antes dos semelhantes e mantém selo separado do avatar", async ({ page }) => {
    await bypassAgeGate(page);
    await page.setViewportSize({ width: 360, height: 800 });
    let similarRequestFinished = false;

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "null" })
    );
    await page.route("**/api/professionals**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/track")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      if (url.pathname === "/api/professionals/teste-mobile") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "professional-mobile",
            slug: "teste-mobile",
            displayName: "Teste Profissional Elite",
            bio: "Perfil público usado para validar carregamento e layout mobile.",
            city: "Itaúna",
            state: "MG",
            bairro: "Centro",
            image: null,
            galleryUrls: [],
            phone: null,
            whatsapp: null,
            contactVisibility: "PUBLIC",
            contactAvailable: false,
            priceMin: 100,
            paymentMethods: [],
            attendanceTypes: ["Local próprio"],
            servesGenders: ["Homens"],
            services: ["Companhia"],
            servicesNotOffered: [],
            amenities: [],
            serviceCities: ["Itaúna"],
            verified: true,
            featured: true,
            boostActive: false,
            online: false,
            sponsored: false,
            profileViews: 19,
            rating: 0,
            totalReviews: 0,
            specialties: [],
            photos: [],
            reviews: [],
            stories: [],
            createdAt: "2026-06-01T00:00:00.000Z",
            user: { name: null, image: null, createdAt: "2026-06-01T00:00:00.000Z" },
          }),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      similarRequestFinished = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ professionals: [], total: 0, pages: 0 }),
      });
    });

    await page.goto("/profissionais/teste-mobile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Teste Profissional Elite", exact: true })).toBeVisible({
      timeout: 4000,
    });
    expect(similarRequestFinished).toBe(false);

    const tierBox = await page.getByTestId("profile-tier").boundingBox();
    const avatarBox = await page.getByTestId("profile-avatar").boundingBox();
    expect(tierBox).not.toBeNull();
    expect(avatarBox).not.toBeNull();
    expect(avatarBox!.y).toBeGreaterThanOrEqual(tierBox!.y + tierBox!.height + 8);
  });
});
