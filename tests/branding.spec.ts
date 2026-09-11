import { expect, test, type Page, type Route } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

const SYMBOL_ASSET = "elite-modell-symbol-v20260911.png";
const FULL_LOGO_ASSET = "elite-modell-official-v20260911.jpg";
const SOCIAL_ASSET = "elite-modell-social-v20260911.png";

async function bypassAgeGate(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
}

async function mockAuth(page: Page) {
  const user = {
    id: "branding-client-id",
    name: "Cliente Branding",
    email: "branding@teste.elitemodell.local",
    image: null,
    role: "GUEST",
    accountType: "client",
    clientStatus: "UNVERIFIED",
    isProfessional: false,
    needsConsent: false,
    activeProfileType: "CLIENTE" as const,
    availableProfiles: ["CLIENTE"] as const,
    adultVerified: true,
  };
  await installMockSessionCookie(page.context(), {
    ...user,
    availableProfiles: ["CLIENTE"],
  });
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user, expires: new Date(Date.now() + 86_400_000).toISOString() }),
    }),
  );
  await page.route("**/api/users/me**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...user, lgpdConsent: true, termsConsent: true }),
    }),
  );
}

async function expectLoadedImage(page: Page, selector: string) {
  const image = page.locator(selector).first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0))
    .toBe(true);
}

test.describe("identidade oficial Elite Modell", () => {
  test("home usa símbolo oficial no header e logo completo no footer", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expectLoadedImage(page, `nav img[src*="${SYMBOL_ASSET}"]`);
    await expectLoadedImage(page, `footer img[src*="${FULL_LOGO_ASSET}"]`);
  });

  test("login e cadastro carregam os novos assets", async ({ page }) => {
    await bypassAgeGate(page);

    for (const route of ["/login", "/cadastro"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectLoadedImage(page, `img[src*="${SYMBOL_ASSET}"]`);
    }
    await expectLoadedImage(page, `img[src*="${FULL_LOGO_ASSET}"]`);
  });

  test("dashboard autenticado usa o símbolo oficial", async ({ page }) => {
    await bypassAgeGate(page);
    await mockAuth(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expectLoadedImage(page, `img[src*="${SYMBOL_ASSET}"]`);
  });

  test("favicon, manifest e imagens sociais respondem", async ({ request }) => {
    for (const asset of [
      "/favicon.ico",
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/favicon-48x48.png",
      "/icon.png",
      "/apple-icon.png",
      "/manifest.webmanifest",
      `/brand/${SYMBOL_ASSET}`,
      `/brand/${FULL_LOGO_ASSET}`,
      `/brand/${SOCIAL_ASSET}`,
    ]) {
      const response = await request.get(asset);
      expect(response.ok(), asset).toBe(true);
    }
  });

  test("head publica canonical, ícones e cards da marca oficial", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();

    expect(html).toContain('rel="canonical" href="https://www.elitemodell.com.br"');
    expect(html).toContain("/favicon.ico");
    expect(html).toContain("elite-modell-symbol-v20260911-180.png");
    expect(html).toContain("opengraph-image.png");
    expect(html).toContain("twitter-image.png");
    expect(html).toContain('"logo":"https://www.elitemodell.com.br/brand/elite-modell-symbol-v20260911-512.png"');
  });
});
