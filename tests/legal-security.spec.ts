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
    expect(dimensions.text).toContain("maiores de 18 anos");
  });

  test("descoberta adulta exige declaracao e preserva gravacoes autenticadas", async ({ request }) => {
    const publicResponses = await Promise.all([
      request.get("/api/professionals"),
      request.get("/api/professionals/slug-publico"),
      request.get("/api/stories"),
      request.get("/api/reviews?professionalId=clx0000000000000000000000"),
    ]);

    for (const response of publicResponses) {
      expect([401, 403]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toContain("storage/v1/object/public");
    }

    const declaredHeaders = { Cookie: "elite_modell_age_declaration=confirmed" };
    const declaredResponses = await Promise.all([
      request.get("/api/professionals", { headers: declaredHeaders }),
      request.get("/api/professionals/slug-publico", { headers: declaredHeaders }),
      request.get("/api/stories", { headers: declaredHeaders }),
      request.get("/api/reviews?professionalId=clx0000000000000000000000", { headers: declaredHeaders }),
    ]);
    for (const response of declaredResponses) {
      expect([401, 403]).not.toContain(response.status());
    }

    const [privateMedia, properties, favorite, review] = await Promise.all([
      request.get("/api/media/clx0000000000000000000000"),
      request.get("/api/properties"),
      request.post("/api/favorites/professionals", { data: { professionalId: "clx0000000000000000000000" } }),
      request.post("/api/reviews", { data: {} }),
    ]);
    expect([401, 403]).toContain(privateMedia.status());
    expect(properties.status()).toBe(410);
    await expect(properties.json()).resolves.toMatchObject({ error: "Recurso desativado." });
    expect(favorite.status()).toBe(401);
    expect([401, 403]).toContain(review.status());
  });

  test("rodape usa os quatro canais sociais atuais com icones acessiveis", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer");

    for (const label of ["Instagram", "WhatsApp", "YouTube", "Telegram"]) {
      const social = footer.getByLabel(label);
      await expect(social).toHaveCount(1);
      await expect(social.locator("svg")).toHaveCount(1);
    }
    await expect(footer.getByLabel("TikTok")).toHaveCount(0);
  });

  test("declaracao etaria libera paginas publicas sem sessao", async ({ page, context }) => {
    await page.goto("/profissionais/perfil-publico", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/verificacao-idade");

    await context.addCookies([{
      name: "elite_modell_age_declaration",
      value: "confirmed",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
    }]);

    for (const route of ["/buscar", "/cidade", "/profissionais", "/profissionais/perfil-publico"]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(500);
      expect(page.url(), route).not.toContain("/verificacao-idade");
    }
  });

  test("robots e sitemap indexam paginas institucionais sem expor conteudo adulto", async ({ request }) => {
    const [robots, sitemap] = await Promise.all([
      request.get("/robots.txt"),
      request.get("/sitemap.xml"),
    ]);
    const robotsText = await robots.text();
    const sitemapText = await sitemap.text();

    expect(robotsText).toContain("Disallow: /buscar");
    expect(robotsText).toContain("Disallow: /profissionais");
    expect(sitemapText).not.toContain("/profissionais");
    expect(sitemapText).not.toContain("/buscar");
    expect(sitemapText).toContain("/terms");
    expect(sitemapText).toContain("/privacy");
    expect(sitemapText).toContain("/politica-conteudo");
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
