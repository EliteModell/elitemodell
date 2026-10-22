import { expect, test, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
let adminUserId = "";

async function installAdminSession(context: BrowserContext) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !adminUserId) throw new Error("Sessão administrativa de teste indisponível.");
  const value = await encode({
    secret,
    maxAge: 60 * 60,
    token: { id: adminUserId, sub: adminUserId, role: "ADMIN", needsConsent: false },
  });
  await context.addCookies([{
    name: "next-auth.session-token",
    value,
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    httpOnly: true,
    sameSite: "Lax",
  }]);
}

test.beforeAll(async () => {
  const assignment = await prisma.adminRoleAssignment.findFirst({
    where: { active: true, revokedAt: null, user: { blocked: false } },
    orderBy: { grantedAt: "asc" },
    select: { userId: true },
  });
  adminUserId = assignment?.userId ?? "";
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("carrega toda a lista sem paginação, sem duplicar e preserva cartão aberto", async ({ page, context }) => {
  test.skip(!adminUserId, "Nenhum administrador ativo disponível para o teste somente leitura.");
  await installAdminSession(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/profissionais", { waitUntil: "domcontentloaded" });

  const totalText = await page.locator(".admin-professional-total strong").innerText();
  const total = Number(totalText.replace(/\D/g, ""));
  const cards = page.locator("article.pro-card");
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThanOrEqual(10);
  expect(initialCount).toBeLessThanOrEqual(15);
  await expect(page.getByRole("link", { name: "Próxima" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);
  await expect(page.getByText(/Página \d+ de \d+/)).toHaveCount(0);

  const firstDetails = cards.first().locator("details");
  await firstDetails.locator("summary").click();
  await expect(firstDetails).toHaveAttribute("open", "");

  for (let attempt = 0; attempt < 12 && await cards.count() < total; attempt += 1) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const before = await cards.count();
    await expect.poll(() => cards.count(), { timeout: 10_000 }).toBeGreaterThan(before);
  }

  expect(await cards.count()).toBe(total);
  const ids = await cards.evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(firstDetails).toHaveAttribute("open", "");
});

test("busca e filtros reiniciam a lista sem misturar resultados", async ({ page, context }) => {
  test.skip(!adminUserId, "Nenhum administrador ativo disponível para o teste somente leitura.");
  await installAdminSession(context);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/profissionais", { waitUntil: "domcontentloaded" });

  const firstName = (await page.locator(".pro-identity a").first().innerText()).trim();
  await page.getByRole("searchbox", { name: "Busca por nome" }).fill(firstName);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator("article.pro-card")).toHaveCount(1, { timeout: 10_000 });

  await page.getByLabel("Status KYC").selectOption("APPROVED");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/kyc=APPROVED/);
  const ids = await page.locator("article.pro-card").evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
});
