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

  test("APIs publicas sensiveis exigem sessao com maioridade", async ({ request }) => {
    const responses = await Promise.all([
      request.get("/api/professionals"),
      request.get("/api/professionals/slug-publico"),
      request.get("/api/stories"),
      request.get("/api/reviews?professionalId=clx0000000000000000000000"),
      request.get("/api/media/clx0000000000000000000000"),
      request.get("/api/properties"),
    ]);

    for (const response of responses) {
      expect([401, 403]).toContain(response.status());
      expect(response.headers()["cache-control"] ?? "").toContain("no-store");
      const body = await response.text();
      expect(body).not.toContain("storage/v1/object/public");
      expect(body).not.toContain("professionals");
      expect(body).not.toContain("properties");
    }
  });

  test("paginas de perfil/listagem redirecionam visitante para barreira etaria", async ({ page }) => {
    await page.goto("/profissionais/perfil-publico", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/verificacao-idade");

    await page.goto("/buscar", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/verificacao-idade");
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
