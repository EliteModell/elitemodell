import { expect, test } from "@playwright/test";
import { suggestCities, parseCityQuery } from "../src/lib/city-catalog";
import municipalities from "../src/data/brazilian-cities.json";

const variants = ["Vit", "Vitória", "Vitoria", "Vitória ES", "Vitória, ES"];

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
    const response = await request.get(`/api/locations/cities?input=${encodeURIComponent(input)}`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.degraded).toBeUndefined();
    expect(data.cities[0]).toMatchObject({ city: "Vitória", state: "ES" });
    expect(data.cities[0].count).toBeGreaterThan(0);
  }
  for (const city of variants.slice(1)) {
    const response = await request.get(`/api/professionals?city=${encodeURIComponent(city)}&state=ES`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.professionals.length).toBeGreaterThan(0);
    expect(data.professionals.every((profile: { city: string; state: string }) => profile.city === "Vitória" && profile.state === "ES")).toBe(true);
  }
  const wrongState = await request.get(`/api/professionals?city=Vitoria&state=MG`);
  expect((await wrongState.json()).total).toBe(0);
  const unknownCity = await request.get(`/api/professionals?city=CidadeInexistente&state=ES`);
  expect((await unknownCity.json()).total).toBe(0);
  const embeddedState = await request.get(`/api/professionals?city=Vitoria%2C%20ES`);
  const embedded = await embeddedState.json();
  expect(embedded.total).toBeGreaterThan(0);
  expect(embedded.professionals.every((profile: { state: string }) => profile.state === "ES")).toBe(true);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_cookie_consent", "accepted");
  });
});

for (const surface of ["home", "modal"] as const) {
  test(`${surface}: type, select Vitória ES, search and render real profile`, async ({ page, request }) => {
    const response = await request.get("/api/professionals?city=Vitoria&state=ES&category=MULHER");
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
      await page.getByRole("button", { name: "Buscar acompanhantes", exact: true }).click();
    }
    await expect(page).toHaveURL(/cidade=Vit%C3%B3ria&estado=es/);
    await expect(page.getByText(profile.displayName, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(`a[href*="${profile.slug}"]`).first()).toBeVisible();
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
