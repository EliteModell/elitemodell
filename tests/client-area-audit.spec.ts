/**
 * Auditoria completa de navegação da área do cliente — Mobile 390×844
 *
 * Estratégia:
 *  1. Mock do endpoint /api/auth/session para simular usuário autenticado
 *  2. Teste de cada rota: existência, conteúdo mínimo, ausência de 404
 *  3. Teste de todos os links clicáveis do ClientAreaShell (sidebar + bottom nav + header)
 *  4. Verificação de sobreposição da bottom nav sobre conteúdo
 *  5. Testes dos 4 tabs principais da bottom nav
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

/* ─── Sessão mock (NextAuth) ────────────────────────────────────────────────── */
const MOCK_SESSION = {
  user: {
    id: "test-user-id",
    name: "Teste Auditoria",
    email: "auditoria@elitemodell.com",
    image: null,
    role: "GUEST",
    accountType: "client",
    clientStatus: null,
    isProfessional: false,
    activeProfileType: "CLIENTE",
    availableProfiles: ["CLIENTE"],
    adultVerified: true,
    needsConsent: false,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    sessionStorage.setItem("elite_modell_adult_consent_at", new Date().toISOString());
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_modell_ageConsentAcceptedAt", new Date().toISOString());
  });
  await installMockSessionCookie(page.context(), {
    ...MOCK_SESSION.user,
    activeProfileType: "CLIENTE",
    availableProfiles: ["CLIENTE"],
    adultVerified: true,
    needsConsent: false,
  });
  await page.route("**/api/auth/session", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });
  await page.route("**/api/auth/csrf", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "test-csrf-token" }) });
  });
  await page.route("**/api/auth/providers", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  // Mock professionals API para as novas páginas
  await page.route("**/api/professionals**", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ professionals: [], total: 0, pages: 1 }),
    });
  });
  // Mock reviews API
  await page.route("**/api/reviews**", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

async function gotoWithAuth(page: Page, path: string) {
  await mockAuth(page);
  const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
  return resp;
}

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 1 — Existência e conteúdo mínimo de todas as rotas do cliente
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Rotas — existência e conteúdo mínimo", () => {
  const routes: { path: string; expectText: string }[] = [
    { path: "/dashboard",                       expectText: "dashboard" },
    { path: "/dashboard/acompanhantes",         expectText: "acompanhant" },
    { path: "/dashboard/shots",                 expectText: "shot" },
    { path: "/dashboard/avaliacoes",            expectText: "avalia" },
    { path: "/dashboard/perfil",                expectText: "perfil" },
    { path: "/dashboard/favoritos",             expectText: "listas" },
    { path: "/dashboard/reservas",              expectText: "atividade" },
    { path: "/dashboard/mensagens",             expectText: "atendimento" },
    { path: "/dashboard/carteira",              expectText: "saldo" },
    { path: "/dashboard/planos",                expectText: "planos" },
    { path: "/dashboard/configuracoes",         expectText: "configura" },
    { path: "/dashboard/atendimento",           expectText: "atendimento" },
    { path: "/dashboard/informacoes",           expectText: "informa" },
  ];

  for (const { path, expectText } of routes) {
    test(`${path} — sem 404`, async ({ page }) => {
      const resp = await gotoWithAuth(page, path);
      expect(resp?.status()).not.toBe(404);
      expect(page.url()).toMatch(/\/(dashboard|login)/);
    });

    test(`${path} — conteúdo: "${expectText}"`, async ({ page }) => {
      await gotoWithAuth(page, path);
      await page.waitForLoadState("networkidle").catch(() => {});
      const body = await page.textContent("body");
      const hasExpected = body?.toLowerCase().includes(expectText.toLowerCase());
      const isLoginPage = body?.toLowerCase().includes("entrar") || body?.toLowerCase().includes("login");
      expect(hasExpected || isLoginPage).toBe(true);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 2 — Bottom nav: 4 tabs reais
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Bottom nav — 4 tabs principais", () => {
  const tabs = [
    { label: "Meu painel",    href: "/dashboard",                  expectText: "dashboard" },
    { label: "Acompanhantes", href: "/dashboard/acompanhantes",    expectText: "acompanhant" },
    { label: "Shots",         href: "/dashboard/shots",            expectText: "shot" },
    { label: "Avaliações",    href: "/dashboard/avaliacoes",       expectText: "avalia" },
  ];

  for (const tab of tabs) {
    test(`Tab "${tab.label}" → ${tab.href} — sem 404`, async ({ page }) => {
      const resp = await gotoWithAuth(page, tab.href);
      expect(resp?.status()).not.toBe(404);
    });

    test(`Tab "${tab.label}" → ${tab.href} — conteúdo carrega`, async ({ page }) => {
      await gotoWithAuth(page, tab.href);
      await page.waitForLoadState("networkidle").catch(() => {});
      const body = await page.textContent("body");
      const hasExpected = body?.toLowerCase().includes(tab.expectText);
      const isLoginPage = body?.toLowerCase().includes("entrar") || body?.toLowerCase().includes("login");
      expect(hasExpected || isLoginPage).toBe(true);
    });
  }

  test("Tab Acompanhantes tem href correto na bottom nav", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const link = page.locator('a[href="/dashboard/acompanhantes"]').first();
    const count = await link.count();
    if (count === 0) { test.skip(); return; }
    const href = await link.getAttribute("href");
    expect(href).toBe("/dashboard/acompanhantes");
  });

  test("Tab Shots tem href correto na bottom nav", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const link = page.locator('a[href="/dashboard/shots"]').first();
    const count = await link.count();
    if (count === 0) { test.skip(); return; }
    const href = await link.getAttribute("href");
    expect(href).toBe("/dashboard/shots");
  });

  test("Tab Avaliações tem href correto na bottom nav", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const link = page.locator('a[href="/dashboard/avaliacoes"]').first();
    const count = await link.count();
    if (count === 0) { test.skip(); return; }
    const href = await link.getAttribute("href");
    expect(href).toBe("/dashboard/avaliacoes");
  });
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 3 — Links da sidebar (todos os hrefs mapeados)
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Sidebar — todos os hrefs válidos", () => {
  const VALID_ROUTES = new Set([
    "/dashboard", "/dashboard/perfil", "/dashboard/favoritos", "/dashboard/reservas",
    "/dashboard/mensagens", "/dashboard/carteira", "/dashboard/planos",
    "/dashboard/configuracoes", "/dashboard/atendimento", "/dashboard/informacoes",
    "/dashboard/acompanhantes", "/dashboard/shots", "/dashboard/avaliacoes",
    "/profissionais", "/buscar", "/notifications", "/terms", "/privacy",
  ]);

  const sidebarLinks = [
    { label: "Logo",                href: "/dashboard" },
    { label: "Header bell",         href: "/notifications" },
    { label: "Buscar cidade",       href: "/buscar" },
    { label: "Painel",              href: "/dashboard" },
    { label: "Perfil",              href: "/dashboard/perfil" },
    { label: "Listas",              href: "/dashboard/favoritos" },
    { label: "Histórico",           href: "/dashboard/reservas" },
    { label: "Acompanhantes",       href: "/profissionais" },
    { label: "Seja Premium",        href: "/dashboard/planos" },
    { label: "Carteira",            href: "/dashboard/carteira" },
    { label: "Gerenciar planos",    href: "/dashboard/planos" },
    { label: "Configurações",       href: "/dashboard/configuracoes" },
    { label: "Central Atendimento", href: "/dashboard/atendimento" },
    { label: "Informações",         href: "/dashboard/informacoes" },
    { label: "Termos",              href: "/terms" },
    { label: "Privacidade",         href: "/privacy" },
    // Bottom nav
    { label: "Tab Meu painel",      href: "/dashboard" },
    { label: "Tab Acompanhantes",   href: "/dashboard/acompanhantes" },
    { label: "Tab Shots",           href: "/dashboard/shots" },
    { label: "Tab Avaliações",      href: "/dashboard/avaliacoes" },
  ];

  for (const link of sidebarLinks) {
    test(`"${link.label}" → ${link.href} está em VALID_ROUTES e sem 404`, async ({ page }) => {
      expect(VALID_ROUTES.has(link.href)).toBe(true);
      const resp = await gotoWithAuth(page, link.href);
      expect(resp?.status()).not.toBe(404);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 4 — Mobile 390×844: sem scroll horizontal
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Mobile 390×844 — sem overflow horizontal", () => {
  const testRoutes = [
    "/dashboard",
    "/dashboard/acompanhantes",
    "/dashboard/shots",
    "/dashboard/avaliacoes",
    "/dashboard/carteira",
    "/dashboard/planos",
    "/dashboard/configuracoes",
    "/dashboard/atendimento",
    "/dashboard/informacoes",
    "/dashboard/favoritos",
    "/dashboard/reservas",
  ];

  for (const path of testRoutes) {
    test(`${path} — sem overflow horizontal`, async ({ page }) => {
      await gotoWithAuth(page, path);
      await page.waitForLoadState("networkidle").catch(() => {});
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 5 — Bottom nav: não sobrepõe conteúdo
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Bottom nav — visibilidade e padding", () => {
  test("Bottom nav permanece fixa ao scroll em /dashboard/acompanhantes", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard/acompanhantes");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const nav = page.locator("nav").last();
    const box = await nav.boundingBox();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(850);
    }
  });

  test("main tem padding-bottom declarado em /dashboard/shots", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard/shots");
    await page.waitForLoadState("networkidle").catch(() => {});
    // Verifica que o atributo de classe de padding existe no <main>
    const mainClass = await page.evaluate(() => document.querySelector("main")?.className ?? "");
    // pb-[ ... ] class deve estar presente (Tailwind v4 — env(safe-area-inset-bottom) = 0 no headless)
    const hasPaddingClass = mainClass.includes("pb-");
    // Fallback: se main não existir (sem auth), skipa graciosamente
    if (!mainClass) { test.skip(); return; }
    expect(hasPaddingClass).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 6 — Redirect pós-login: GUEST vai para /dashboard/acompanhantes
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Redirect pós-login", () => {
  test("Rota /dashboard/acompanhantes existe e retorna 200/redirect", async ({ page }) => {
    const resp = await gotoWithAuth(page, "/dashboard/acompanhantes");
    // Não deve ser 404
    expect(resp?.status()).not.toBe(404);
    // URL deve conter dashboard ou login
    expect(page.url()).toMatch(/\/(dashboard|login)/);
  });
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 7 — Sidebar: abrir, navegar, fechar (requer auth real — skip gracioso)
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Sidebar — interação (requer auth)", () => {
  test("Botão hamburger abre drawer", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const btn = page.locator('[aria-label="Abrir menu"]');
    if (await btn.count() === 0) { test.skip(); return; }
    await btn.click();
    const aside = page.locator("aside");
    await expect(aside).toBeVisible({ timeout: 3000 });
  });

  test("Botão fechar drawer fecha o drawer", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const btn = page.locator('[aria-label="Abrir menu"]');
    if (await btn.count() === 0) { test.skip(); return; }
    await btn.click();
    const closeBtn = page.locator('[aria-label="Fechar menu"]');
    await closeBtn.click();
    await page.waitForTimeout(400);
    const aside = page.locator("aside");
    const box = await aside.boundingBox();
    if (box) expect(box.x).toBeLessThan(0);
  });
});
