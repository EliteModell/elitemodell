import { expect, test } from "@playwright/test";
import { suggestCities, parseCityQuery } from "../src/lib/city-catalog";
import { isProfessionalDisplayNameReady } from "../src/lib/professional-display-name";
import municipalities from "../src/data/brazilian-cities.json";

const variants = ["Vit", "Vitória", "Vitoria", "Vitória ES", "Vitória, ES"];
const AGE_HEADERS = { Cookie: "elite_modell_age_declaration=confirmed" };

test("national catalog, normalized queries, ranking and homonyms", () => {
  expect(municipalities.length).toBeGreaterThan(5500);
  expect(new Set(municipalities.map((item) => item.state)).size).toBe(27);
  for (const input of variants) expect(suggestCities(input, [], 6).some((item) => item.city === "Vitória" && item.state === "ES")).toBe(true);
  expect(suggestCities("Vit", [{ city: "Vitória", state: "ES", count: 1 }])[0].label).toBe("Vitória, ES");
  expect(suggestCities("Manaus")[0].state).toBe("AM");
  expect(suggestCities("Florianopolis")[0].state).toBe("SC");
  expect(suggestCities("Natal RN")[0].city).toBe("Natal");
  expect(suggestCities("ES").every((item) => item.state === "ES")).toBe(true);
  expect(suggestCities("Bom Jesus").filter((item) => item.city === "Bom Jesus").length).toBeGreaterThan(1);
  expect(suggestCities("cidade inexistente xyz")).toEqual([]);
  expect(parseCityQuery("  VITÓRIA / es ")).toEqual({ city: "vitoria", state: "ES" });
});

test("real APIs return the registered Vitória professional for every spelling", async ({ request }) => {
  for (const input of variants) {
    const response = await request.get(`/api/locations/cities?input=${encodeURIComponent(input)}`, { headers: AGE_HEADERS });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.degraded).toBeUndefined();
    expect(data.cities[0]).toMatchObject({ city: "Vitória", state: "ES" });
    expect(data.cities[0].count).toBeGreaterThan(0);
  }
  for (const city of variants.slice(1)) {
    const response = await request.get(`/api/professionals?city=${encodeURIComponent(city)}&state=ES`, { headers: AGE_HEADERS });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.professionals.length).toBeGreaterThan(0);
    expect(data.professionals.every((profile: { city: string; state: string }) => profile.city === "Vitória" && profile.state === "ES")).toBe(true);
  }
  const wrongState = await request.get(`/api/professionals?city=Vitoria&state=MG`, { headers: AGE_HEADERS });
  expect((await wrongState.json()).total).toBe(0);
  const unknownCity = await request.get(`/api/professionals?city=CidadeInexistente&state=ES`, { headers: AGE_HEADERS });
  expect((await unknownCity.json()).total).toBe(0);
  const embeddedState = await request.get(`/api/professionals?city=Vitoria%2C%20ES`, { headers: AGE_HEADERS });
  const embedded = await embeddedState.json();
  expect(embedded.total).toBeGreaterThan(0);
  expect(embedded.professionals.every((profile: { state: string }) => profile.state === "ES")).toBe(true);
});

test("available cities expose only positive public totals in descending order", async ({ request }) => {
  const response = await request.get("/api/locations/available-cities");
  expect(response.ok()).toBe(true);
  const data = await response.json() as {
    cities: Array<{ city: string; state: string; count: number }>;
  };

  expect(data.cities.length).toBeGreaterThan(0);
  expect(data.cities.every((item) => item.city && /^[A-Z]{2}$/.test(item.state) && item.count > 0)).toBe(true);
  expect(data.cities.map((item) => item.count)).toEqual(
    [...data.cities].map((item) => item.count).sort((left, right) => right - left),
  );
  expect(new Set(data.cities.map((item) => `${item.city}|${item.state}`)).size).toBe(data.cities.length);
});

test("Elite Stories permanece como primeiro item institucional", async ({ request }) => {
  const response = await request.get("/api/stories?city=Vitoria&state=ES", { headers: AGE_HEADERS });
  expect(response.ok()).toBe(true);
  const stories = await response.json();
  expect(stories[0]).toMatchObject({ userId: "elite-platform", nome: "Elite Stories", institutional: true });
});

test("contas internas conhecidas nunca ficam elegiveis para exibicao publica", async ({ request }) => {
  for (const name of ["Railson Delas😈", "Sofia Teste", "Teste Profissional Elite"]) {
    expect(isProfessionalDisplayNameReady(name)).toBe(false);
  }
  const response = await request.get("/api/professionals?sortBy=recent&limit=24", { headers: AGE_HEADERS });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  const names = data.professionals.map((profile: { displayName: string }) => profile.displayName.trim());
  expect(names).not.toContain("Railson Delas😈");
  expect(names).not.toContain("Sofia Teste");
  expect(names).not.toContain("Teste Profissional Elite");
});

test("perfis e stories respeitam municipio e UF entre Linhares e Itauna", async ({ request }) => {
  for (const location of [{ city: "Linhares", state: "ES" }, { city: "Itaúna", state: "MG" }]) {
    const query = `city=${encodeURIComponent(location.city)}&state=${location.state}`;
    const profilesResponse = await request.get(`/api/professionals?${query}`, { headers: AGE_HEADERS });
    expect(profilesResponse.ok()).toBe(true);
    const profiles = (await profilesResponse.json()).professionals;
    expect(profiles.every((profile: { city: string; state: string }) => profile.city === location.city && profile.state === location.state)).toBe(true);

    const storiesResponse = await request.get(`/api/stories?${query}`, { headers: AGE_HEADERS });
    expect(storiesResponse.ok()).toBe(true);
    const stories = await storiesResponse.json();
    expect(stories[0]).toMatchObject({ userId: "elite-platform", institutional: true });
    expect(stories.slice(1).every((story: { city: string; state: string }) => story.city === location.city && story.state === location.state)).toBe(true);
  }
});

test("maioridade forte valida nao reabre aviso e sessao sem verificacao continua bloqueada", async ({ browser }) => {
  for (const adultVerified of [true, false]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route("**/api/auth/session", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "visitor", role: "GUEST", adultVerified },
        expires: new Date(Date.now() + 60_000).toISOString(),
      }),
    }));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: "Tenho 18 anos ou mais" });
    if (adultVerified) await expect(button).toHaveCount(0);
    else await expect(button).toBeVisible();
    await context.close();
  }
});

test("cidade sem stories locais nao recebe mistura automatica", async ({ page }) => {
  const institutional = [{
    userId: "elite-platform",
    slug: "politica-conteudo",
    nome: "Elite Stories",
    foto: "/android-chrome-512x512.png",
    institutional: true,
    stories: [],
  }];
  await page.route("**/api/stories?city=Linhares&state=ES", (route) => route.fulfill({ json: institutional }));
  await page.route("**/api/professionals?**", (route) => route.fulfill({ json: { professionals: [], total: 0, page: 1, pages: 0 } }));
  await page.goto("/buscar?tab=acompanhantes&cidade=Linhares&estado=es");
  await expect(page.getByText(/Nenhum story disponível em Linhares, ES/)).toBeVisible();
  await expect(page.getByText("Elite Stories", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver stories de outras regiões" })).toBeVisible();
});

test.beforeEach(async ({ page, context }, testInfo) => {
  await context.addCookies([{
    name: "elite_modell_age_declaration",
    value: "confirmed",
    url: testInfo.project.use.baseURL as string,
  }]);
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_cookie_consent", "accepted");
  });
});

test("modal lists published cities and applies a selected city immediately", async ({ page }) => {
  await page.route("**/api/locations/available-cities", (route) => route.fulfill({
    json: {
      cities: [
        { city: "São Paulo", state: "SP", count: 4 },
        { city: "Vitória", state: "ES", count: 1 },
      ],
    },
  }));
  await page.route("**/api/professionals?**", (route) => route.fulfill({
    json: { professionals: [], total: 0, page: 1, pages: 0 },
  }));
  await page.route("**/api/stories?**", (route) => route.fulfill({ json: [] }));

  await page.goto("/buscar?tab=acompanhantes&selecionarCidade=1");
  const dialog = page.getByRole("dialog", { name: "Selecionar localização" });
  await dialog.getByRole("button", { name: "Onde tem acompanhantes?" }).click();
  await expect(dialog.getByRole("button", { name: "São Paulo, SP: 4 perfis públicos" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Vitória, ES: 1 perfil público" })).toBeVisible();

  await dialog.getByRole("button", { name: "Vitória, ES: 1 perfil público" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/cidade=Vit%C3%B3ria&estado=es/);
  await expect(page.getByRole("heading", { name: /Vitória, ES/ })).toBeVisible();
});

test("empty city keeps the visitor choice and offers available cities", async ({ page }) => {
  await page.route("**/api/professionals?**", (route) => route.fulfill({
    json: { professionals: [], total: 0, page: 1, pages: 0 },
  }));
  await page.route("**/api/stories?**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/locations/available-cities", (route) => route.fulfill({
    json: { cities: [{ city: "Vitória", state: "ES", count: 2 }] },
  }));

  await page.goto("/buscar?cidade=Manaus&estado=am");
  await expect(page.getByRole("heading", { name: "Ainda não temos profissionais disponíveis nesta cidade." })).toBeVisible();
  await expect(page).toHaveURL(/cidade=Manaus&estado=am/);
  await page.getByRole("button", { name: "Ver cidades com acompanhantes" }).click();
  await expect(page.getByRole("dialog", { name: "Selecionar localização" })
    .getByRole("button", { name: "Vitória, ES: 2 perfis públicos" })).toBeVisible();
  await expect(page).toHaveURL(/cidade=Manaus&estado=am/);
});

test("available cities remain reachable in the reduced iPhone keyboard viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 430 });
  await page.route("**/api/locations/available-cities", (route) => route.fulfill({
    json: { cities: [{ city: "Vitória", state: "ES", count: 2 }] },
  }));
  await page.goto("/buscar?tab=acompanhantes&selecionarCidade=1", { waitUntil: "load" });

  const dialog = page.getByRole("dialog", { name: "Selecionar localização" });
  await dialog.getByPlaceholder("Digite cidade ou UF").focus();
  await dialog.getByRole("button", { name: "Onde tem acompanhantes?" }).click();
  const city = dialog.getByRole("button", { name: "Vitória, ES: 2 perfis públicos" });
  await expect(city).toBeVisible();
  await expect.poll(() => city.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= (window.visualViewport?.height ?? window.innerHeight) + 1;
  })).toBe(true);
});

test("home story selector chooses one city without changing the main location", async ({ page }) => {
  let requestedStoryRegion = "";
  await page.addInitScript(() => {
    localStorage.setItem("elite_modell_public_location", JSON.stringify({ city: "Salvador", state: "BA", label: "Salvador, BA" }));
  });
  await page.route("**/api/locations/available-cities", (route) => route.fulfill({ json: {
    cities: [
      { city: "Salvador", state: "BA", count: 3 },
      { city: "Recife", state: "PE", count: 2 },
    ],
  } }));
  await page.route("**/api/stories", (route) => route.fulfill({ json: [
    { userId: "elite-platform", slug: "politica-conteudo", nome: "Elite Stories", foto: "/android-chrome-512x512.png", institutional: true, stories: [] },
    { userId: "recife-story", slug: "recife-model", nome: "Recife Story", foto: null, city: "Recife", state: "PE", stories: [{ id: "story-1" }, { id: "story-2" }] },
  ] }));
  await page.route("**/api/stories?city=**", async (route) => {
    const url = new URL(route.request().url());
    const city = url.searchParams.get("city");
    requestedStoryRegion = `${city}|${url.searchParams.get("state")}`;
    await route.fulfill({ json: [
      { userId: "elite-platform", slug: "politica-conteudo", nome: "Elite Stories", foto: "/android-chrome-512x512.png", institutional: true, stories: [] },
      ...(city === "Recife" ? [{ userId: "recife-story", slug: "recife-model", nome: "Recife Story", foto: null, city: "Recife", state: "PE", stories: [{ id: "story-1", mediaUrl: "/test.jpg", mediaType: "image", thumbnail: null, views: 0, createdAt: new Date().toISOString() }] }] : []),
    ] });
  });
  await page.route("**/api/professionals?**", (route) => route.fulfill({ json: { professionals: [], total: 0 } }));

  await page.goto("/");
  await page.getByRole("button", { name: "Ver stories de outras regiões" }).click();
  const dialog = page.getByRole("dialog", { name: "Escolha uma cidade" });
  await expect(dialog.getByText("2 stories disponíveis")).toBeVisible();
  await dialog.getByRole("button", { name: /Recife, PE/ }).click();
  await expect(page.getByText("Recife", { exact: true })).toBeVisible();
  await expect.poll(() => requestedStoryRegion).toBe("Recife|PE");
  await expect(page.getByText("Elite", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("elite_modell_public_location"))).toContain("Salvador");
});

test("visitante anonimo navega por cidade, filtros e perfil sem cadastro", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: testInfo.project.use.userAgent as string,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Tenho 18 anos ou mais" }).click(),
    ]);

    const session = await page.evaluate(() => fetch("/api/auth/session").then((response) => response.json()));
    expect(session).toEqual({});

    const input = page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" });
    await input.fill("Itauna");
    await page.getByRole("option").filter({ hasText: "Itaúna, MG" }).getByRole("button").click();
    await page.getByRole("button", { name: "Buscar perfis" }).click();

    await expect(page).toHaveURL(/\/buscar\?.*cidade=Ita%C3%BAna.*estado=mg/i);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Itaúna, MG/ })).toBeVisible();

    const profileLink = page.locator('a[href^="/profissionais/"]').first();
    await expect(profileLink).toBeVisible({ timeout: 30_000 });
    await profileLink.click();
    await expect(page).toHaveURL(/\/profissionais\//);
    await expect(page).not.toHaveURL(/\/login/);

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/buscar\?.*cidade=Ita%C3%BAna/i);
    await page.getByRole("button", { name: /Localização da busca.*Alterar/ }).click();
    await page.getByPlaceholder("Digite cidade ou UF").fill("Vitoria ES");
    await page.getByRole("button", { name: "Vitória, ES" }).click();
    await page.getByRole("button", { name: /Ver acompanhantes em Vitória, ES/ }).click();
    await expect(page).toHaveURL(/cidade=Vit%C3%B3ria.*estado=es/i);

    await page.getByRole("button", { name: "Online" }).click();
    await expect(page.getByRole("button", { name: "Online" })).toHaveClass(/active/);
    await expect(page).not.toHaveURL(/\/login/);
  } finally {
    await context.close();
  }
});

for (const surface of ["home", "modal"] as const) {
  test(`${surface}: type, select Vitória ES, search and render real profile`, async ({ page, request }) => {
    const response = await request.get("/api/professionals?city=Vitoria&state=ES&category=MULHER", { headers: AGE_HEADERS });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.professionals.length).toBeGreaterThan(0);
    const profile = data.professionals[0];
    await page.goto(surface === "home" ? "/" : "/buscar?tab=acompanhantes&selecionarCidade=1");
    const input = surface === "home" ? page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" }) : page.getByPlaceholder("Digite cidade ou UF");
    for (const variant of variants) {
      await input.fill(variant);
      const choice = surface === "home" ? page.getByRole("option").filter({ hasText: "Vitória, ES" }) : page.getByRole("dialog").getByRole("button", { name: /Vitória, ES/ });
      await expect(choice).toBeVisible();
    }
    if (surface === "home") {
      await page.getByRole("option").filter({ hasText: "Vitória, ES" }).getByRole("button").click();
      await page.getByRole("button", { name: "Buscar perfis" }).click();
    } else {
      await page.getByRole("dialog").getByRole("button", { name: /Vitória, ES/ }).click();
      await page.getByRole("button", { name: /Ver acompanhantes em Vitória, ES/ }).click();
    }
    await expect(page).toHaveURL(/cidade=Vit%C3%B3ria&estado=es/);
    await expect(page.getByText(profile.displayName, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    const card = page.locator(`a[href*="${profile.slug}"]`).first();
    await expect(card).toBeVisible();
    if (profile.image) {
      await expect.poll(() => card.locator("img").first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
  });
}

test("Home still suggests national cities when ranking API is unavailable", async ({ page }) => {
  await page.route("**/api/locations/cities?**", (route) => route.abort());
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" });
  await input.fill("Vit");
  await expect(page.getByRole("option").filter({ hasText: "Vitória, ES" })).toBeVisible();
  await input.fill("Manaus");
  await expect(page.getByRole("option").filter({ hasText: "Manaus, AM" })).toBeVisible();
  await expect(page.getByRole("option").filter({ hasText: "Vitória, ES" })).toHaveCount(0);
});

test("modal mantem Linhares acessivel no viewport reduzido pelo teclado", async ({ page }) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 430 });
    await page.goto("/buscar?tab=acompanhantes&selecionarCidade=1", { waitUntil: "load" });
    const dialog = page.getByRole("dialog", { name: "Selecionar localização" });
    await dialog.getByPlaceholder("Digite cidade ou UF").fill("Linhares");
    const choice = dialog.getByRole("button", { name: "Linhares, ES" });
    await expect(choice).toBeVisible();
    const geometry = await choice.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: window.visualViewport?.height ?? window.innerHeight };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport + 1);
    await choice.click();
    await expect(dialog.getByRole("button", { name: "Ver acompanhantes em Linhares, ES" })).toBeVisible();
    await dialog.getByRole("button", { name: "Ver acompanhantes em Linhares, ES" }).click();
    await expect(page).toHaveURL(/cidade=Linhares&estado=es/);
  }
});

test("home mantem Linhares acessivel no viewport reduzido pelo teclado", async ({ page }) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 430 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox", { name: "Buscar acompanhantes por cidade" }).fill("Linhares");
    const choice = page.getByRole("option").filter({ hasText: "Linhares, ES" });
    await expect(choice).toBeVisible();
    await expect.poll(async () => choice.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= (window.visualViewport?.height ?? window.innerHeight) + 1;
    })).toBe(true);
  }
});
