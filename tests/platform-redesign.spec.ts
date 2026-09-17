import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { installMockSessionCookie } from "./helpers/mock-auth";

const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "visual-review", "contrast-audit");
const MOBILE_OUTPUT_DIR = path.join(process.cwd(), "artifacts", "visual-review", "mobile-overflow");
const MOBILE = { width: 390, height: 844 };
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const CLIENT_SESSION = {
  user: {
    id: "test-user-id",
    name: "Conta de revisão",
    email: "auditoria@elitemodell.com",
    image: null,
    role: "GUEST",
    accountType: "client",
    clientStatus: "ACTIVE",
    isProfessional: false,
    needsConsent: false,
    activeProfileType: "CLIENTE" as const,
    availableProfiles: ["CLIENTE"] as Array<"CLIENTE" | "PROFESSIONAL" | "HOST">,
    adultVerified: true,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const PROFESSIONAL_SESSION = {
  user: {
    ...CLIENT_SESSION.user,
    name: "Profissional de revisão",
    role: "HOST",
    accountType: "model",
    isProfessional: true,
    activeProfileType: "PROFESSIONAL" as const,
    availableProfiles: ["PROFESSIONAL"] as Array<"CLIENTE" | "PROFESSIONAL" | "HOST">,
  },
  expires: CLIENT_SESSION.expires,
};

function ensureOutputDirectory() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(MOBILE_OUTPUT_DIR, { recursive: true });
}

async function acceptAdultGate(context: BrowserContext, includeCookies = true) {
  await context.addInitScript((acceptCookies) => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    sessionStorage.setItem("elite_modell_adult_consent_at", new Date().toISOString());
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_modell_ageConsentAcceptedAt", new Date().toISOString());
    if (acceptCookies) localStorage.setItem("elite_cookie_consent", "necessary");
  }, includeCookies);
}

async function assertNoOverflow(page: Page) {
  const audit = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const tolerance = 2;
    const offenders: string[] = [];

    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || rect.width < 1 || rect.height < 1) continue;
      if (rect.left >= -tolerance && rect.right <= viewportWidth + tolerance) continue;

      let clippedByValidContainer = false;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const parentStyle = getComputedStyle(parent);
        const parentRect = parent.getBoundingClientRect();
        if (
          ["auto", "scroll", "hidden", "clip"].includes(parentStyle.overflowX) &&
          parentRect.left >= -tolerance &&
          parentRect.right <= viewportWidth + tolerance
        ) {
          clippedByValidContainer = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (!clippedByValidContainer) {
        offenders.push(`${element.tagName.toLowerCase()}.${String(element.className).split(" ").slice(0, 2).join(".")}`);
      }
    }

    return {
      viewportWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders: offenders.slice(0, 12),
    };
  });

  expect(audit.htmlScrollWidth, JSON.stringify(audit)).toBeLessThanOrEqual(audit.viewportWidth + 1);
  expect(audit.bodyScrollWidth, JSON.stringify(audit)).toBeLessThanOrEqual(audit.viewportWidth + 1);
  expect(audit.offenders, JSON.stringify(audit)).toEqual([]);
}

async function assertGuestHeaderFits(page: Page) {
  const header = page.locator('nav[aria-label="Navegação principal"]');
  if (await header.count() === 0) return;
  const logo = header.getByRole("link", { name: /Elite Modell/i });
  const login = header.getByRole("button", { name: "Entrar", exact: true });
  const signup = header.getByRole("button", { name: "Cadastrar", exact: true });
  const menu = header.getByRole("button", { name: "Abrir menu", exact: true });

  for (const control of [logo, login, signup, menu]) {
    await expect(control).toBeVisible();
  }

  const audit = await header.evaluate((element) => {
    const viewportWidth = document.documentElement.clientWidth;
    const children = Array.from(element.querySelectorAll<HTMLElement>("a, button"))
      .filter((child) => {
        const style = getComputedStyle(child);
        const rect = child.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((child) => {
        const rect = child.getBoundingClientRect();
        return { label: child.getAttribute("aria-label") || child.textContent?.trim(), left: rect.left, right: rect.right };
      });

    return { viewportWidth, children };
  });

  for (const child of audit.children) {
    expect(child.left, JSON.stringify(audit)).toBeGreaterThanOrEqual(0);
    expect(child.right, JSON.stringify(audit)).toBeLessThanOrEqual(audit.viewportWidth + 1);
  }
}

async function capture(page: Page, fileName: string, fullPage = true) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await assertNoOverflow(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage });
}

async function assertReadableControl(page: Page, selector: string) {
  const control = page.locator(selector).first();
  await expect(control).toBeVisible();
  const visual = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.color,
      background: style.backgroundColor,
      opacity: Number(style.opacity),
    };
  });
  expect(visual.opacity).toBeGreaterThanOrEqual(0.68);
  expect(visual.color).not.toBe(visual.background);
}

async function assertDarkText(locator: ReturnType<Page["locator"]>) {
  await expect(locator).toBeVisible();
  const color = await locator.evaluate((element) => getComputedStyle(element).color);
  expect(color).toMatch(/rgb\((23, 20, 29|45, 40, 48|81, 75, 84|87, 81, 92)\)/);
}

async function mockPublicProfessionals(page: Page) {
  const professional = {
    id: "professional-victoria",
    slug: "victoria",
    displayName: "Victoria",
    bio: "Perfil verificado para revisão visual da Elite Modell.",
    city: "São Paulo",
    state: "SP",
    image: "/mock-media/cover.jpg",
    avatar: "/mock-media/cover.jpg",
    galleryUrls: ["/mock-media/gallery.jpg"],
    verified: true,
    featured: true,
    rating: 5,
    totalReviews: 12,
    profileViews: 240,
    specialties: [],
    services: ["Acompanhamento"],
    photos: [
      { id: "cover", url: "/mock-media/cover.jpg", cover: true, order: 0 },
      { id: "gallery", url: "/mock-media/gallery.jpg", cover: false, order: 1 },
    ],
    reviews: [],
    stories: [],
    createdAt: "2026-06-18T12:00:00.000Z",
    user: { name: "Victoria", image: null, createdAt: "2026-06-18T12:00:00.000Z" },
  };

  await page.route("**/api/professionals/victoria", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(professional),
  }));
  await page.route(/\/api\/professionals(?:\?.*)?$/, (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ professionals: [professional], total: 1, pages: 1 }),
  }));
  await page.route("**/_next/image**", (route: Route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: TRANSPARENT_PIXEL,
  }));
}

async function mockClientAccount(page: Page) {
  await installMockSessionCookie(page.context(), CLIENT_SESSION.user);
  await page.route("**/api/auth/session", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(CLIENT_SESSION),
  }));
  await page.route("**/api/auth/csrf", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ csrfToken: "visual-review" }),
  }));
}

async function mockProfessionalAccount(page: Page) {
  await installMockSessionCookie(page.context(), PROFESSIONAL_SESSION.user);
  await page.route("**/api/auth/session", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(PROFESSIONAL_SESSION),
  }));
  await page.route("**/api/auth/csrf", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ csrfToken: "visual-review" }),
  }));
}

test.beforeEach(async ({ page }) => {
  ensureOutputDirectory();
  await page.setViewportSize(MOBILE);
});

test("gera as capturas públicas da migração visual", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".age-card")).toBeVisible();
  await capture(page, "01-age-gate.png", false);

  await page.evaluate(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await capture(page, "03-cookie-banner.png", false);

  await context.addInitScript(() => localStorage.setItem("elite_cookie_consent", "necessary"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await capture(page, "02-home.png");
});

test("gera as capturas de autenticação e cadastros", async ({ page, context }) => {
  await acceptAdultGate(context);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await capture(page, "05-login.png");

  await page.goto("/cadastro?tipo=cliente", { waitUntil: "domcontentloaded" });
  await capture(page, "06-client-signup.png");

  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await assertReadableControl(page, 'input[type="tel"]');
  await assertDarkText(page.getByText("R$ 12.990", { exact: true }).first());
  await capture(page, "07-professional-signup.png");
});

test("gera as capturas de busca e perfil público", async ({ page, context }) => {
  await acceptAdultGate(context);
  await mockPublicProfessionals(page);
  await page.goto("/buscar?tab=acompanhantes", { waitUntil: "domcontentloaded" });
  await assertDarkText(page.getByText("Victoria", { exact: true }));
  await capture(page, "08-search.png");

  await page.goto("/buscar?tab=acompanhantes&selecionarCidade=1", { waitUntil: "domcontentloaded" });
  const locationDialog = page.getByRole("dialog", { name: "Selecionar localização" });
  await expect(locationDialog).toBeVisible();
  await expect(locationDialog.getByRole("heading", { name: "Onde deseja buscar?" })).toBeVisible();
  await assertReadableControl(page, '.location-modal-search input');
  await capture(page, "04-location-modal.png", false);

  await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });
  await capture(page, "09-public-profile.png");
});

test("listagem permanece encaixada e sem busca textual nos mobiles aprovados", async ({ page, context }) => {
  await acceptAdultGate(context);
  await mockPublicProfessionals(page);

  for (const width of [320, 360, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/buscar?tab=acompanhantes&cidade=Itaúna&estado=MG", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("Nome, serviço ou especialidade...")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Buscar", exact: true })).toHaveCount(0);
    await expect(page.getByText("Localização da busca", { exact: true })).toBeVisible();
    await assertGuestHeaderFits(page);
    const locationButton = page.getByRole("button", { name: /Localização da busca/i });
    await expect(locationButton).toBeVisible();
    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('nav[aria-label="Navegação principal"]');
      const location = document.querySelector<HTMLElement>(".location-bar");
      return {
        headerBottom: header?.getBoundingClientRect().bottom ?? 0,
        locationTop: location?.getBoundingClientRect().top ?? -1,
      };
    });
    expect(geometry.locationTop, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.headerBottom);
    await assertNoOverflow(page);
    if (width >= 375) {
      await page.screenshot({
        path: path.join(MOBILE_OUTPUT_DIR, `search-listing-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test("gera as capturas da conta do cliente", async ({ page, context }) => {
  await acceptAdultGate(context);
  await mockClientAccount(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.textContent?.includes("Preparando sua conta"), undefined, { timeout: 15_000 });
  await assertDarkText(page.getByText("Explorar", { exact: true }));
  await assertDarkText(page.getByRole("heading", { name: "Histórico de perfis" }));
  await capture(page, "10-client-dashboard.png");

  await page.goto("/dashboard/configuracoes", { waitUntil: "domcontentloaded" });
  await capture(page, "12-settings.png");

  for (const width of [320, 360, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/dashboard", "/dashboard/configuracoes"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertNoOverflow(page);
    }
  }
});

test("gera a captura do painel profissional quando a conta E2E permite acesso", async ({ page, context }) => {
  await acceptAdultGate(context);
  await mockProfessionalAccount(page);
  await page.route("**/api/professional/settings", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      maxPauseDays: 60,
      professional: {
        id: "professional-review",
        slug: "professional-review",
        status: "ACTIVE",
        hidePhone: false,
        contactVisibility: "LOGGED_IN",
        hideAge: false,
        pauseUntil: null,
        pauseReason: null,
        boostActive: false,
        boostUntil: null,
        boostSource: null,
        presentationVideoUrl: null,
        presentationVideoStatus: "PENDING",
      },
    }),
  }));
  await page.goto("/profissional/configuracoes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Configurações profissionais" })).toBeVisible();
  await capture(page, "11-professional-dashboard.png");

  for (const width of [320, 360, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/profissional/configuracoes", { waitUntil: "domcontentloaded" });
    await assertNoOverflow(page);
  }
});

test("rotas principais não têm overflow nos breakpoints aprovados", async ({ page, context }) => {
  await acceptAdultGate(context);
  await mockPublicProfessionals(page);
  for (const width of [320, 360, 375, 390, 393, 414, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const route of ["/", "/login", "/cadastro?tipo=cliente", "/cadastro/acompanhante", "/buscar?tab=acompanhantes", "/buscar?tab=acompanhantes&selecionarCidade=1", "/profissionais/victoria"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertNoOverflow(page);
    }
  }
});
