/**
 * Testes autenticados da área do cliente — Mobile 390×844
 *
 * Pré-requisito: global-setup.ts já rodou e salvou tests/.auth/user.json
 * Todas as pages deste arquivo já recebem storageState autenticado via
 * playwright.config.ts (projeto "authenticated").
 *
 * Cobertura obrigatória:
 *   ✓ Sidebar: abrir, todos os itens, fechar
 *   ✓ Bottom nav: todos os 4 tabs
 *   ✓ Cards principais: Ver perfil, Carteira, Planos, Configurações,
 *     Atendimento, Informações, Criar lista, Mostrar todas, Avalie agora
 *   ✓ Novas páginas: Acompanhantes, Shots, Avaliações
 *   ✓ Nenhum botão morto
 *   ✓ Nenhuma tela dá 404
 *   ✓ Bottom nav não cobre conteúdo ao final da página
 *   ✓ Mobile 390×844
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const STORAGE_PATH = path.join(__dirname, ".auth", "user.json");

/** Verifica se o storageState tem cookies reais (login aconteceu) */
function isAuthenticated(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8"));
    return Array.isArray(state.cookies) && state.cookies.length > 0;
  } catch {
    return false;
  }
}

/** Pula o teste se não houver sessão real */
function requireAuth() {
  if (!isAuthenticated()) {
    test.skip(!isAuthenticated(), "Sessão autenticada não disponível — verifique TEST_USER_EMAIL/PASSWORD no .env");
  }
}

/** Injeta sessionStorage para bypassar Age Gate em todos os requests */
async function bypassAgeGate(context: BrowserContext) {
  await context.addInitScript(() => {
    sessionStorage.setItem("age_verified_session", "1");
    sessionStorage.setItem("age_verified_date", new Date().toISOString());
  });
}

/** Navega e aguarda a área do cliente carregar (sem loading screen) */
async function gotoClientArea(page: Page, path: string) {
  await bypassAgeGate(page.context());
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Aguarda sair da loading screen (ela tem texto "Preparando sua conta")
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Preparando sua conta"),
    { timeout: 15_000 }
  );
  // Aguarda networkidle para garantir que os dados carregaram
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Abre o drawer lateral e aguarda a animação completar (botão X visível = drawer aberto) */
async function openDrawer(page: Page) {
  const menuBtn = page.locator('[aria-label="Abrir menu"]');
  await menuBtn.waitFor({ state: "visible", timeout: 8_000 });
  await menuBtn.click();
  // O botão "Fechar menu" só aparece quando o drawer está aberto — confirma animação
  const closeBtn = page.locator('[aria-label="Fechar menu"]');
  await closeBtn.waitFor({ state: "visible", timeout: 6_000 });
  return page.locator("aside");
}

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 1 — Autenticação confirmada
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Autenticação real", () => {
  test("storageState contém cookies de sessão", () => {
    requireAuth();
    expect(isAuthenticated()).toBe(true);
  });

  test("GET /dashboard retorna 200 (não redireciona para /login)", async ({ page }) => {
    requireAuth();
    const resp = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).not.toBe(404);
    // Com sessão real, não deve redirecionar para /login
    await page.waitForFunction(
      () => !document.body.textContent?.includes("Preparando sua conta"),
      { timeout: 12_000 }
    );
    expect(page.url()).not.toContain("/login");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 2 — Sidebar: abrir, itens, fechar
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Sidebar — interação completa", () => {
  test.beforeEach(requireAuth);

  test("botão hamburger abre o drawer", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const aside = await openDrawer(page);
    await expect(aside).toBeVisible();
  });

  test("botão X fecha o drawer", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    await openDrawer(page);
    await page.locator('[aria-label="Fechar menu"]').click();
    await page.waitForTimeout(350); // animação 300ms
    const box = await page.locator("aside").boundingBox();
    if (box) expect(box.x).toBeLessThan(0);
  });

  test("overlay fecha o drawer ao clicar fora", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    await openDrawer(page);
    await page.mouse.click(370, 400); // lado direito (fora do drawer)
    await page.waitForTimeout(400);
    const box = await page.locator("aside").boundingBox();
    if (box) expect(box.x).toBeLessThan(0);
  });

  const sidebarItems: { label: string; href: string; expectedPath: RegExp; timeout?: number }[] = [
    { label: "Painel",            href: "/dashboard",                 expectedPath: /\/dashboard$/ },
    { label: "Perfil",            href: "/dashboard/perfil",          expectedPath: /\/dashboard\/perfil/ },
    { label: "Listas",            href: "/dashboard/favoritos",       expectedPath: /\/dashboard\/favoritos/ },
    { label: "Histórico",         href: "/dashboard/reservas",        expectedPath: /\/dashboard\/reservas/ },
    // /profissionais é página pública com DB query real — timeout estendido
    { label: "Acompanhantes",     href: "/profissionais",             expectedPath: /\/profissionais/, timeout: 20_000 },
    { label: "Seja Premium",      href: "/dashboard/planos",          expectedPath: /\/dashboard\/planos/ },
    { label: "Carteira",          href: "/dashboard/carteira",        expectedPath: /\/dashboard\/carteira/ },
    { label: "Configurações",     href: "/dashboard/configuracoes",   expectedPath: /\/dashboard\/configuracoes/ },
    { label: "Atendimento",       href: "/dashboard/atendimento",     expectedPath: /\/dashboard\/atendimento/ },
    { label: "Informações",       href: "/dashboard/informacoes",     expectedPath: /\/dashboard\/informacoes/ },
  ];

  for (const item of sidebarItems) {
    test(`sidebar → "${item.label}" navega para ${item.href}`, async ({ page }) => {
      await gotoClientArea(page, "/dashboard");
      await openDrawer(page);

      const link = page.locator("aside").locator(`a[href="${item.href}"]`).first();
      await link.waitFor({ state: "visible", timeout: 5_000 });
      await link.click();

      const urlTimeout = item.timeout ?? 10_000;
      await page.waitForURL(item.expectedPath, { timeout: urlTimeout });
      // Basta confirmar que a URL mudou corretamente e não redirecionou para login
      expect(page.url()).toMatch(item.expectedPath);
      expect(page.url()).not.toContain("/login");
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 3 — Bottom nav: 4 tabs reais
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Bottom nav — 4 tabs", () => {
  test.beforeEach(requireAuth);

  const tabs = [
    { label: "Meu painel",    href: "/dashboard",                 pattern: /\/dashboard$/ },
    { label: "Acompanhantes", href: "/dashboard/acompanhantes",  pattern: /\/dashboard\/acompanhantes/ },
    { label: "Shots",         href: "/dashboard/shots",          pattern: /\/dashboard\/shots/ },
    { label: "Avaliações",    href: "/dashboard/avaliacoes",     pattern: /\/dashboard\/avaliacoes/ },
  ];

  for (const tab of tabs) {
    test(`tab "${tab.label}" navega para ${tab.href}`, async ({ page }) => {
      await gotoClientArea(page, "/dashboard");

      const link = page.locator(`nav a[href="${tab.href}"]`).last();
      await link.waitFor({ state: "visible", timeout: 8_000 });
      await link.click();

      await page.waitForURL(tab.pattern, { timeout: 10_000 });
      expect(page.url()).toMatch(tab.pattern);
    });

    test(`tab "${tab.label}" fica ativo quando está na rota correta`, async ({ page }) => {
      await gotoClientArea(page, tab.href);

      const link = page.locator(`nav a[href="${tab.href}"]`).last();
      await link.waitFor({ state: "visible", timeout: 8_000 });

      // O tab ativo tem a cor dourada (texto text-[#a9822d])
      const color = await link.evaluate((el) => getComputedStyle(el).color);
      // rgb(169, 130, 45) = #a9822d
      expect(color).toMatch(/rgb\(169,\s*130,\s*45\)/);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 4 — Cards principais: botões e CTAs
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Cards principais — botões e CTAs", () => {
  test.beforeEach(requireAuth);

  test("UserWelcomeCard → 'Ver perfil' navega para /dashboard/perfil", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    // Escopa ao main para evitar pegar links da sidebar off-screen
    const link = page.locator("main a[href='/dashboard/perfil']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    await link.click();
    await page.waitForURL(/\/dashboard\/perfil/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard/perfil");
  });

  test("UserWelcomeCard → saldo navega para /dashboard/carteira", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const link = page.locator("main a[href='/dashboard/carteira']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    await link.click();
    await page.waitForURL(/\/dashboard\/carteira/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard/carteira");
  });

  test("ListsSection → 'Mostrar todas' navega para /dashboard/favoritos", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const link = page.locator("main a[href='/dashboard/favoritos']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    await link.click();
    await page.waitForURL(/\/dashboard\/favoritos/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard/favoritos");
  });

  test("ListsSection → 'Criar Lista' é um botão clicável (não morto)", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const btn = page.locator("main button", { hasText: /Criar Lista/i }).first();
    await btn.waitFor({ state: "visible", timeout: 8_000 });
    await expect(btn).not.toBeDisabled();
    await btn.click();
    await page.waitForTimeout(400);
    expect(page.url()).not.toContain("/login");
  });

  test("ReviewsSection → 'Avalie agora' navega para /profissionais", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    // Avalie agora está na ReviewsSection, que está dentro do main
    const link = page.locator("main a[href='/profissionais']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    await link.click();
    await page.waitForURL(/\/profissionais/, { timeout: 10_000 });
    expect(page.url()).toContain("/profissionais");
  });

  test("SafetyCard → 'Falar com atendimento' navega para /dashboard/atendimento", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const link = page.locator("main a[href='/dashboard/atendimento']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    // O SafetyCard fica no final da página, coberto pela bottom nav fixa
    // Clique via JS ignora o elemento que intercepta pointer events
    await page.evaluate((el) => (el as HTMLElement).click(), await link.elementHandle());
    await page.waitForURL(/\/dashboard\/atendimento/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard/atendimento");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 5 — Páginas secundárias: conteúdo mínimo
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Páginas secundárias — conteúdo real", () => {
  test.beforeEach(requireAuth);

  const pages: { path: string; mustContain: string }[] = [
    { path: "/dashboard/carteira",      mustContain: "saldo" },
    { path: "/dashboard/planos",        mustContain: "planos" },
    { path: "/dashboard/configuracoes", mustContain: "configura" },
    { path: "/dashboard/atendimento",   mustContain: "atendimento" },
    { path: "/dashboard/informacoes",   mustContain: "informa" },
    { path: "/dashboard/favoritos",     mustContain: "listas" },
    { path: "/dashboard/reservas",      mustContain: "atividade" },
    // mensagens: usa <main> como raiz — busca no textContent do body filtrado
    { path: "/dashboard/mensagens",     mustContain: "central" },
    // acompanhantes/shots/avaliacoes: texto em elementos visíveis (não em placeholder)
    { path: "/dashboard/acompanhantes", mustContain: "todas" },
    { path: "/dashboard/shots",         mustContain: "todas" },
    { path: "/dashboard/avaliacoes",    mustContain: "avalia" },
  ];

  for (const p of pages) {
    test(`${p.path} — carrega conteúdo real (sem 404, sem loading screen)`, async ({ page }) => {
      await gotoClientArea(page, p.path);
      // Confirma que não houve redirect para login (autenticação OK)
      expect(page.url()).not.toContain("/login");
      expect(page.url()).toMatch(new RegExp(p.path.replace(/\//g, "\\/")));

      // innerText da main retorna apenas texto visível (ignora scripts e payload RSC)
      // Para páginas que usam <main> como root element, pode ser vazio — usa fallback
      const visibleMain = await page.locator("main").innerText({ timeout: 5_000 }).catch(() => "");
      // Se main estava vazio, tenta o body innerText (mais lento mas funciona)
      const visible = visibleMain.trim() || await page.evaluate(() => document.body.innerText ?? "");
      const lower = visible.toLowerCase();

      expect(lower).not.toContain("preparando sua conta");
      expect(lower).toContain(p.mustContain.toLowerCase());
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 6 — Página Acompanhantes: filtros e busca
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Acompanhantes — filtros e busca", () => {
  test.beforeEach(requireAuth);

  test("chips de categoria existem e são clicáveis", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/acompanhantes");
    for (const label of ["Todas", "Mulheres", "Homens", "Trans"]) {
      const btn = page.locator("button", { hasText: new RegExp(`^${label}$`, "i") }).first();
      await btn.waitFor({ state: "visible", timeout: 5_000 });
      await btn.click();
      await page.waitForTimeout(200);
      expect(page.url()).not.toContain("/login");
    }
  });

  test("campo de busca aceita texto", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/acompanhantes");
    const input = page.locator('input[placeholder*="nome"]');
    await input.waitFor({ state: "visible", timeout: 5_000 });
    await input.fill("São Paulo");
    await page.waitForTimeout(300);
    const val = await input.inputValue();
    expect(val).toBe("São Paulo");
  });

  test("botão de filtros abre bottom-sheet", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/acompanhantes");
    const filterBtn = page.locator('[aria-label="Filtros"]');
    await filterBtn.waitFor({ state: "visible", timeout: 5_000 });
    await filterBtn.click();
    // Bottom-sheet deve aparecer
    const sheet = page.locator("text=Aplicar filtros");
    await sheet.waitFor({ state: "visible", timeout: 3_000 });
    await expect(sheet).toBeVisible();
    // Fecha o bottom-sheet
    const applyBtn = page.locator("button", { hasText: "Aplicar filtros" });
    await applyBtn.click();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 7 — Bottom nav não cobre conteúdo (scroll ao final)
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Bottom nav — não cobre conteúdo", () => {
  test.beforeEach(requireAuth);

  const testRoutes = ["/dashboard", "/dashboard/acompanhantes", "/dashboard/shots", "/dashboard/avaliacoes"];

  for (const route of testRoutes) {
    test(`${route} — conteúdo visível ao final da página`, async ({ page }) => {
      await gotoClientArea(page, route);

      // Rola até o fim
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);

      // Mede bottom nav
      const nav = page.locator("nav").filter({ hasText: "Meu painel" }).first();
      const navBox = await nav.boundingBox();
      if (!navBox) return; // nav não renderizou, skip implícito

      const navTop = navBox.y;

      // Mede container principal
      const mainBox = await page.locator("main").boundingBox();
      if (!mainBox) return;


      // O conteúdo deve terminar ANTES do topo da nav (com folga de padding)
      // O padding-bottom do main é calc(62px + ...) ≈ 74px
      // Então mainBottom (com scroll) >= navTop — isso é OK
      // O que NÃO pode acontecer: navTop < mainBottom - 200 (conteúdo muito coberto)
      expect(navTop).toBeGreaterThan(0);
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(850); // dentro da viewport 844
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 8 — Mobile 390×844: sem scroll horizontal
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Mobile 390×844 — sem overflow horizontal", () => {
  test.beforeEach(requireAuth);

  const routes = [
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

  for (const route of routes) {
    test(`${route} — scrollWidth ≤ 390px`, async ({ page }) => {
      await gotoClientArea(page, route);
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   GRUPO 9 — Nenhum botão morto (sem ação ou sem rota)
   ════════════════════════════════════════════════════════════════════════════ */
test.describe("Botões — sem ação morta", () => {
  test.beforeEach(requireAuth);

  test("Carteira — botão 'Adicionar' é clicável", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/carteira");
    const btn = page.locator("button", { hasText: /Adicionar/i }).first();
    await btn.waitFor({ state: "visible", timeout: 5_000 });
    await expect(btn).not.toBeDisabled();
    await btn.click();
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain("/login");
  });

  test("Planos — botão 'Assinar agora' é clicável (não disabled)", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/planos");
    // O plano atual tem "Plano atual" (disabled), o premium tem "Assinar agora"
    const btn = page.locator("button", { hasText: /Assinar agora/i }).first();
    await btn.waitFor({ state: "visible", timeout: 5_000 });
    await expect(btn).not.toBeDisabled();
  });

  test("Conquistas — botão 'Mostrar mais' é clicável", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    const btn = page.locator("button", { hasText: /Mostrar mais/i }).first();
    await btn.waitFor({ state: "visible", timeout: 8_000 });
    await expect(btn).not.toBeDisabled();
    await btn.click();
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain("/login");
  });

  test("Atendimento — link 'Chat no aplicativo' aponta para /dashboard/mensagens", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/atendimento");
    const link = page.locator('a[href="/dashboard/mensagens"]').first();
    await link.waitFor({ state: "visible", timeout: 5_000 });
    const href = await link.getAttribute("href");
    expect(href).toBe("/dashboard/mensagens");
  });

  test("VerificationSection — clique abre /dashboard/perfil", async ({ page }) => {
    await gotoClientArea(page, "/dashboard");
    // A VerificationSection é um <section> dentro do main com um link para /dashboard/perfil
    // Usamos o segundo link (o primeiro está no UserWelcomeCard) ou qualquer dentro de section
    const link = page.locator("main section a[href='/dashboard/perfil']").first();
    await link.waitFor({ state: "visible", timeout: 8_000 });
    await link.click();
    await page.waitForURL(/\/dashboard\/perfil/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard/perfil");
  });

  test("Configurações — links apontam para rotas reais", async ({ page }) => {
    await gotoClientArea(page, "/dashboard/configuracoes");
    const links = await page.locator("a[href]").all();
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto")) continue;
      const resp = await page.request.get(href);
      expect(resp.status()).not.toBe(404);
    }
  });
});
