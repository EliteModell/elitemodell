import { expect, test } from "@playwright/test";

test.describe("juridico e seguranca - visitante", () => {
  test("worker de exclusao exige CRON_SECRET", async ({ request }) => {
    const response = await request.post("/api/internal/workers/data-deletion");
    expect(response.status()).toBe(401);
  });

  test("exportacao juridica exige administrador e MFA", async ({ request }) => {
    const response = await request.get("/api/admin/legal/export");
    expect([401, 403, 428]).toContain(response.status());
  });

  test("fila administrativa de uploads nao e publica", async ({ request }) => {
    const response = await request.get("/api/admin/uploads");
    expect([401, 403, 428]).toContain(response.status());
  });

  test("exclusao e exportacao de dados exigem sessao", async ({ request }) => {
    const deletion = await request.get("/api/users/me/delete");
    const dataExport = await request.get("/api/users/me/export");
    expect(deletion.status()).toBe(401);
    expect(dataExport.status()).toBe(401);
  });

  test("pagamento, reserva e upload rejeitam visitante", async ({ request }) => {
    const [pix, card, booking, upload] = await Promise.all([
      request.post("/api/payments/pix", { data: {} }),
      request.post("/api/payments/card", { data: {} }),
      request.post("/api/bookings", { data: {} }),
      request.post("/api/upload", { multipart: {} }),
    ]);
    for (const response of [pix, card, booking, upload]) {
      expect([401, 403]).toContain(response.status());
    }
  });

  test("URLs administrativas diretas redirecionam usuario sem sessao", async ({ page }) => {
    await page.goto("/admin/juridico/pendencias", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/login/);
  });

  test("minutas internas de governanca nao sao acessiveis sem sessao", async ({ page }) => {
    await page.goto("/admin/juridico/governanca/minutas", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/login/);
  });

  test("barreira etaria informativa nao possui overflow em mobile", async ({ page }) => {
    const response = await page.goto("/verificacao-idade", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
      text: document.body.innerText.toLowerCase(),
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
    expect(dimensions.text).toContain("maioridade");
  });

  test("descoberta publica permite leitura anonima e preserva gravacoes autenticadas", async ({ request }) => {
    const publicResponses = await Promise.all([
      request.get("/api/professionals"),
      request.get("/api/professionals/slug-publico"),
      request.get("/api/stories"),
      request.get("/api/reviews?professionalId=clx0000000000000000000000"),
    ]);

    for (const response of publicResponses) {
      expect([200, 404]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toContain("storage/v1/object/public");
    }

    const [privateMedia, properties, favorite, review] = await Promise.all([
      request.get("/api/media/clx0000000000000000000000"),
      request.get("/api/properties"),
      request.post("/api/favorites/professionals", { data: { professionalId: "clx0000000000000000000000" } }),
      request.post("/api/reviews", { data: {} }),
    ]);
    expect(privateMedia.status()).toBe(404);
    expect([401, 403]).toContain(properties.status());
    expect(favorite.status()).toBe(401);
    expect(review.status()).toBe(401);
  });

  test("configuracao da roleta e publica, mas respeita consentimento e travas operacionais", async ({ request }) => {
    const withoutConsent = await request.get("/api/vouchers/roulette");
    expect(withoutConsent.status()).toBe(200);
    expect(await withoutConsent.json()).toMatchObject({
      active: false,
      canSpin: false,
      consentRequired: true,
    });

    const withConsent = await request.get("/api/vouchers/roulette", {
      headers: { Cookie: "elite_cookie_consent=marketing" },
    });
    expect(withConsent.status()).toBe(200);
    const body = await withConsent.json();
    expect(body.error).not.toBe("Unauthorized");
    expect(typeof body.active).toBe("boolean");
    expect(typeof body.canSpin).toBe("boolean");
  });

  test("roleta reage ao consentimento de campanha sem recarregar a busca", async ({ page }) => {
    let configRequests = 0;
    await page.route("**/api/vouchers/roulette", async (route) => {
      configRequests += 1;
      const hasConsent = (await route.request().allHeaders()).cookie?.includes("elite_cookie_consent=marketing");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(hasConsent
          ? {
              active: true,
              canSpin: true,
              blockedUntil: null,
              prizes: [
                { id: "one", index: 0, name: "Voucher", type: "VOUCHER", value: 5, requiresPayment: false, paymentAmount: null },
                { id: "two", index: 1, name: "Tente novamente", type: "TRY_AGAIN", value: null, requiresPayment: false, paymentAmount: null },
              ],
              policy: {
                key: "roleta-promocional-policy",
                title: "Politica da Roleta Promocional",
                href: "/documentos/roleta-promocional-policy",
                version: "1.0",
                hash: "test",
                authorizationReference: "TEST",
              },
            }
          : { active: false, canSpin: false, consentRequired: true, prizes: [] }),
      });
    });

    await page.goto("/buscar", { waitUntil: "domcontentloaded" });
    await expect.poll(() => configRequests).toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
      document.cookie = "elite_cookie_consent=marketing; Path=/; SameSite=Lax";
      window.dispatchEvent(new CustomEvent("elite-cookie-consent", {
        detail: { value: "marketing", choices: { marketing: true } },
      }));
    });

    await expect(page.getByRole("dialog", { name: "Roleta Premiada" })).toBeVisible();
    expect(configRequests).toBeGreaterThanOrEqual(2);
  });

  test("rodape usa os cinco icones sociais no lugar de letras", async ({ page }) => {
    await page.goto("/buscar", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer");

    for (const label of ["Instagram", "WhatsApp", "TikTok", "YouTube", "Telegram"]) {
      const social = footer.getByLabel(label);
      await expect(social).toHaveCount(1);
      await expect(social.locator("svg")).toHaveCount(1);
    }
  });

  test("paginas de perfil e listagem ficam acessiveis ao visitante", async ({ page }) => {
    await page.goto("/profissionais/perfil-publico", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/profissionais/perfil-publico");

    await page.goto("/buscar", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/buscar");
  });

  test("robots e sitemap nao indexam conteudo adulto ou minutas juridicas", async ({ request }) => {
    const [robots, sitemap] = await Promise.all([
      request.get("/robots.txt"),
      request.get("/sitemap.xml"),
    ]);
    const robotsText = await robots.text();
    const sitemapText = await sitemap.text();

    expect(robotsText).toContain("Disallow: /");
    expect(sitemapText).not.toContain("/profissionais");
    expect(sitemapText).not.toContain("/buscar");
    expect(sitemapText).not.toContain("/terms");
    expect(sitemapText).not.toContain("/privacy");
    expect(sitemapText).not.toContain("storage/v1/object/public");
  });

  test("paginas juridicas publicas identificam a versao operacional sem alegar aprovacao juridica", async ({ request }) => {
    const routes = [
      "/terms",
      "/privacy",
      "/politica-conteudo",
      "/documentos/cookies-policy",
    ];

    for (const route of routes) {
      const response = await request.get(route);
      expect(response.status()).toBeLessThan(500);
      const body = (await response.text()).toUpperCase();
      expect(body).toContain("PENDENTE DE RATIFICACAO JURIDICA FINAL");
      expect(body).not.toContain("APROVADO PELA ADVOGADA");
    }
  });
});
