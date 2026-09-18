import { expect, test, type Page } from "@playwright/test";

const UI_LOGO = "elite-modell-logo.png";

async function bypassAgeGate(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
}

test.describe("logo por contexto", () => {
  test("header e footer usam a marca horizontal transparente", async ({ page }) => {
    await bypassAgeGate(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const headerLogo = page.locator(`nav img[src*="${UI_LOGO}"]`).first();
    const footerLogo = page.locator(`footer img[src*="${UI_LOGO}"]`).first();
    await expect(headerLogo).toBeVisible();
    await expect(footerLogo).toBeVisible();
    await expect(page.locator("nav img[src*='icon']")).toHaveCount(0);
    await expect(page.locator("nav img[src*='favicon']")).toHaveCount(0);

    const presentation = await headerLogo.evaluate((element) => {
      const imageStyle = getComputedStyle(element);
      const containerStyle = getComputedStyle(element.parentElement as HTMLElement);
      return {
        filter: imageStyle.filter,
        opacity: imageStyle.opacity,
        objectFit: imageStyle.objectFit,
        background: containerStyle.backgroundColor,
        borderTop: containerStyle.borderTopWidth,
      };
    });
    expect(presentation).toEqual({
      filter: "saturate(0.58) brightness(0.78)",
      opacity: "1",
      objectFit: "contain",
      background: "rgba(0, 0, 0, 0)",
      borderTop: "0px",
    });
  });

  test("login e cadastro usam logo de interface, não app icon", async ({ page }) => {
    await bypassAgeGate(page);
    for (const path of ["/login", "/cadastro"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(`img[src*="${UI_LOGO}"]`).first()).toBeVisible();
    }
  });

  test("asset de interface é transparente e sem blur", async ({ request }) => {
    const response = await request.get(`/brand/${UI_LOGO}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(100_000);
  });

  test("favicon e app icons continuam separados da marca de interface", async ({ request }) => {
    const home = await request.get("/");
    const html = await home.text();
    expect(html).toContain(`%2Fbrand%2F${UI_LOGO}`);
    expect(html).toContain("/favicon.ico");
    expect(html).toContain("/manifest.webmanifest");

    const manifest = await (await request.get("/manifest.webmanifest")).text();
    expect(manifest).toContain("/android-chrome-192x192.png");
    expect(manifest).toContain("/android-chrome-512x512.png");
    expect(manifest).not.toContain(UI_LOGO);
  });
});
