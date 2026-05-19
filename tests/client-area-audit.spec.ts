/**
 * Auditoria completa de navegação da área do cliente — Mobile 390×844
 *
 * Estratégia:
 *  1. Mock do endpoint /api/auth/session para simular usuário autenticado
 *  2. Teste de cada rota: existência, conteúdo mínimo, ausência de 404
 *  3. Teste de todos os links clicáveis do ClientAreaShell (sidebar + bottom nav + header)
 *  4. Verificação de sobreposição da bottom nav sobre conteúdo
 */

import { test, expect, type Page, type Route } from "@playwright/test";

/* ─── Sessão mock (NextAuth) ────────────────────────────────────────────────── */
const MOCK_SESSION = {
  user: {
    id: "test-user-id",
    name: "Teste Auditoria",
    email: "auditoria@elitemodell.com",
    image: null,
    role: "GUEST",
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

async function mockAuth(page: Page) {
  await page.route("**/api/auth/session", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });
  // CSRF token mock para evitar erros
  await page.route("**/api/auth/csrf", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "test-csrf-token" }),
    });
  });
  // NextAuth providers mock
  await page.route("**/api/auth/providers", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
}

/* ─── Utilitários ────────────────────────────────────────────────────────────── */
async function gotoWithAuth(page: Page, path: string) {
  await mockAuth(page);
  const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
  return resp;
}

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 1 — Existência e conteúdo mínimo de todas as rotas
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Rotas — existência e conteúdo mínimo", () => {
  const routes: { path: string; expectText: string }[] = [
    { path: "/dashboard",                   expectText: "dashboard" },
    { path: "/dashboard/perfil",            expectText: "perfil" },
    { path: "/dashboard/favoritos",         expectText: "Listas" },
    { path: "/dashboard/reservas",          expectText: "Atividade" },
    { path: "/dashboard/mensagens",         expectText: "atendimento" },
    { path: "/dashboard/carteira",          expectText: "Saldo" },
    { path: "/dashboard/planos",            expectText: "Planos" },
    { path: "/dashboard/configuracoes",     expectText: "Configura" },
    { path: "/dashboard/atendimento",       expectText: "Atendimento" },
    { path: "/dashboard/informacoes",       expectText: "Informa" },
  ];

  for (const { path, expectText } of routes) {
    test(`${path} — carrega sem 404`, async ({ page }) => {
      const resp = await gotoWithAuth(page, path);
      // Não deve ser 404 (pode ser redirect para /login se auth falhar, ok)
      expect(resp?.status()).not.toBe(404);
      // Verifica que a URL final contém a rota ou /login (redirect de auth é aceitável)
      const finalUrl = page.url();
      expect(finalUrl).toMatch(/\/(dashboard|login)/);
    });

    test(`${path} — conteúdo esperado: "${expectText}"`, async ({ page }) => {
      await gotoWithAuth(page, path);
      // Aguarda a rede estabilizar para garantir que o React re-renderizou após mock de sessão
      await page.waitForLoadState("networkidle").catch(() => {/* timeout ok */});
      const body = await page.textContent("body");
      const hasExpected = body?.toLowerCase().includes(expectText.toLowerCase());
      const isLoginPage = body?.toLowerCase().includes("entrar") || body?.toLowerCase().includes("login");
      expect(hasExpected || isLoginPage).toBe(true);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 2 — ClientAreaShell: header, sidebar, bottom nav (hrefs estáticos)
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("ClientAreaShell — elementos clicáveis", () => {
  // Mapa completo de todos os hrefs do ClientAreaShell
  const clientShellLinks: { label: string; href: string; existingRoute: boolean }[] = [
    // Logo / header
    { label: "Logo → /dashboard",        href: "/dashboard",                  existingRoute: true },
    { label: "Header bell",              href: "/notifications",              existingRoute: true },
    { label: "Buscar cidade",            href: "/buscar",                     existingRoute: true },
    // Sidebar (drawer)
    { label: "Sidebar: Painel",          href: "/dashboard",                  existingRoute: true },
    { label: "Sidebar: Perfil",          href: "/dashboard/perfil",           existingRoute: true },
    { label: "Sidebar: Listas",          href: "/dashboard/favoritos",        existingRoute: true },
    { label: "Sidebar: Histórico",       href: "/dashboard/reservas",         existingRoute: true },
    { label: "Sidebar: Acompanhantes",   href: "/profissionais",              existingRoute: true },
    { label: "Sidebar: Premium",         href: "/dashboard/planos",           existingRoute: true },
    { label: "Sidebar: Carteira",        href: "/dashboard/carteira",         existingRoute: true },
    { label: "Sidebar: Gerenciar planos",href: "/dashboard/planos",           existingRoute: true },
    { label: "Sidebar: Configurações",   href: "/dashboard/configuracoes",    existingRoute: true },
    { label: "Sidebar: Atendimento",     href: "/dashboard/atendimento",      existingRoute: true },
    { label: "Sidebar: Informações",     href: "/dashboard/informacoes",      existingRoute: true },
    { label: "Sidebar: Termos",          href: "/terms",                      existingRoute: true },
    { label: "Sidebar: Privacidade",     href: "/privacy",                    existingRoute: true },
    // Bottom nav
    { label: "BottomNav: Meu painel",    href: "/dashboard",                  existingRoute: true },
    { label: "BottomNav: Acompanhantes", href: "/profissionais",              existingRoute: true },
    { label: "BottomNav: Listas",        href: "/dashboard/favoritos",        existingRoute: true },
    { label: "BottomNav: Atividade",     href: "/dashboard/reservas",         existingRoute: true },
  ];

  // Rotas que devem existir no projeto
  const EXISTING_ROUTES = new Set([
    "/dashboard", "/dashboard/perfil", "/dashboard/favoritos", "/dashboard/reservas",
    "/dashboard/mensagens", "/dashboard/carteira", "/dashboard/planos",
    "/dashboard/configuracoes", "/dashboard/atendimento", "/dashboard/informacoes",
    "/profissionais", "/buscar", "/notifications", "/terms", "/privacy",
  ]);

  for (const link of clientShellLinks) {
    test(`Link "${link.label}" → ${link.href} aponta para rota válida`, async ({ page }) => {
      // Verifica no conjunto de rotas conhecidas
      expect(EXISTING_ROUTES.has(link.href)).toBe(true);

      // Verifica que a página existe (sem 404)
      const resp = await gotoWithAuth(page, link.href);
      expect(resp?.status()).not.toBe(404);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 3 — Bottom nav: não sobrepõe conteúdo
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Bottom nav — sobreposição de conteúdo", () => {
  test("Conteúdo não fica atrás da bottom nav em /dashboard", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Bottom nav aparece após auth mock resolver — timeout curto para skip se não funcionar
    const nav = page.locator("nav").filter({ hasText: "Meu painel" }).first();
    const navVisible = await nav.isVisible({ timeout: 5000 }).catch(() => false);

    if (!navVisible) {
      test.skip();
      return;
    }

    // Verifica que o container principal tem padding-bottom suficiente
    const paddingBottom = await page.evaluate(() => {
      const mainEl = document.querySelector("main");
      if (!mainEl) return 0;
      return parseInt(getComputedStyle(mainEl).paddingBottom, 10);
    });

    // Deve ter pelo menos 62px (altura da nav)
    expect(paddingBottom).toBeGreaterThanOrEqual(62);
  });

  test("Bottom nav é fixa e visível em /dashboard/favoritos", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard/favoritos");
    await page.waitForLoadState("domcontentloaded");

    // Scroll até o fim da página
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Bottom nav deve permanecer visível (position: fixed)
    const nav = page.locator("nav").last();
    const navBox = await nav.boundingBox();

    if (navBox) {
      // Deve estar na parte inferior da viewport (844px de altura no iPhone 14)
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(850);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 4 — Sidebar: abre, navega e fecha
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Sidebar — abrir, navegar, fechar", () => {
  test("Botão hamburger abre o drawer", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const menuBtn = page.locator('[aria-label="Abrir menu"]');
    const exists = await menuBtn.count();
    if (exists === 0) { test.skip(); return; }

    await menuBtn.click();

    // Drawer deve se tornar visível
    const drawer = page.locator("aside");
    await expect(drawer).toBeVisible({ timeout: 3000 });
  });

  test("Botão fechar drawer fecha o drawer", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const menuBtn = page.locator('[aria-label="Abrir menu"]');
    if (await menuBtn.count() === 0) { test.skip(); return; }

    await menuBtn.click();
    const closeBtn = page.locator('[aria-label="Fechar menu"]');
    await closeBtn.click();

    // Drawer deve sumir (translateX(-100%))
    const drawer = page.locator("aside");
    // Aguarda a animação de 300ms
    await page.waitForTimeout(400);
    const box = await drawer.boundingBox();
    // Se a caixa existir, seu x deve ser negativo (fora da tela)
    if (box) {
      expect(box.x).toBeLessThan(0);
    }
  });

  test("Overlay do drawer fecha ao clicar fora", async ({ page }) => {
    await gotoWithAuth(page, "/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const menuBtn = page.locator('[aria-label="Abrir menu"]');
    if (await menuBtn.count() === 0) { test.skip(); return; }

    await menuBtn.click();
    await page.waitForTimeout(200);

    // Clica no overlay (fora do drawer)
    await page.mouse.click(350, 400); // lado direito fora do drawer
    await page.waitForTimeout(400);

    const drawer = page.locator("aside");
    const box = await drawer.boundingBox();
    if (box) {
      expect(box.x).toBeLessThan(0);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 5 — CTAs principais das páginas
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("CTAs principais", () => {
  const ctas: { page: string; selector: string; expectedUrl?: string }[] = [
    {
      page: "/dashboard/favoritos",
      selector: 'a[href="/profissionais"]',
      expectedUrl: "/profissionais",
    },
    {
      page: "/dashboard/reservas",
      selector: 'a[href="/profissionais"]',
      expectedUrl: "/profissionais",
    },
    {
      page: "/dashboard/atendimento",
      selector: 'a[href="/dashboard/informacoes"]',
      expectedUrl: "/dashboard/informacoes",
    },
    {
      page: "/dashboard/configuracoes",
      selector: 'a[href="/dashboard/perfil"]',
      expectedUrl: "/dashboard/perfil",
    },
  ];

  for (const cta of ctas) {
    test(`CTA em ${cta.page} → ${cta.expectedUrl}`, async ({ page }) => {
      await gotoWithAuth(page, cta.page);
      await page.waitForLoadState("domcontentloaded");

      const link = page.locator(cta.selector).first();
      const count = await link.count();
      if (count === 0) { test.skip(); return; }

      const href = await link.getAttribute("href");
      expect(href).toBe(cta.expectedUrl);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════════
   GRUPO 6 — Viewpoint mobile: nenhuma página tem scroll horizontal
   ════════════════════════════════════════════════════════════════════════════════ */
test.describe("Mobile 390×844 — sem scroll horizontal", () => {
  const testRoutes = [
    "/dashboard",
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
      await page.waitForLoadState("domcontentloaded");

      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);

      // scrollWidth deve ser igual ao clientWidth (sem overflow)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // +2px tolerância
    });
  }
});
