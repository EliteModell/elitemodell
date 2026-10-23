import { expect, test, type Page } from "@playwright/test";
import { installMockSessionCookie } from "./helpers/mock-auth";

const USER_ID = "full-onboarding-user";

function professional(displayName = "") {
  return {
    id: "professional-draft",
    slug: "professional-draft",
    status: "DRAFT",
    registrationSubmittedAt: null,
    displayName,
    bio: "",
    city: "",
    state: "",
    escortCategory: null,
    birthDate: "2000-01-01",
    attendanceTypes: [],
    servesGenders: [],
    diasDisponiveis: [],
    services: [],
    paymentMethods: [],
    whatsapp: "",
    kycStatus: "NOT_STARTED",
    photos: [],
  };
}

test("conta com telefone confirmado retoma o cadastro enquanto o e-mail esta pendente", async ({ page }) => {
  await mockOnboarding(page, "Marina Retorno");
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: USER_ID,
    email: "pendente@example.invalid",
    emailVerified: null,
    birthDate: "2000-01-01",
    professional: professional("Marina Retorno"),
  } }));
  await page.route("**/api/auth/email-confirmation", (route) => route.fulfill({ json: {
    ok: true,
    verified: false,
    maskedEmail: "pe*****@example.invalid",
  } }));

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 1 de 9", { exact: false })).toBeVisible();
  await expect(page.getByText("E-mail pendente de", { exact: false })).toBeVisible();
  await expect(page.getByText("Confirme seu e-mail para continuar")).toHaveCount(0);
  await expect(page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...")).toHaveValue("Marina Retorno");
});

test("sessao expirada orienta reentrada sem criar uma nova conta", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ status: 401, json: { error: "Sessao expirada." } }));

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Entre novamente para continuar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar com meu telefone" })).toHaveAttribute("href", "/cadastro/acompanhante");
});

async function mockOnboarding(page: Page, displayName = "", usePersistedDraft = true) {
  await installMockSessionCookie(page.context(), {
    id: USER_ID,
    name: "Profissional Teste",
    email: "onboarding@example.invalid",
    role: "HOST",
    accountType: "model",
    isProfessional: true,
    professionalStatus: "DRAFT",
    activeProfileType: "PROFESSIONAL",
    availableProfiles: ["PROFESSIONAL"],
    adultVerified: true,
  }, usePersistedDraft ? { persistedProfessionalStatus: "DRAFT" } : {});
  await page.addInitScript(() => {
    localStorage.setItem("elite_cookie_consent", "necessary");
    localStorage.setItem("elitemodell_ageConsentAccepted", "true");
  });
  await page.route("**/api/users/me/activate-professional", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: USER_ID,
    email: "onboarding@example.invalid",
    emailVerified: true,
    birthDate: "2000-01-01",
    lgpdConsent: true,
    termsConsent: true,
    professional: professional(displayName),
  } }));
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: {
    completion: {
      profilePercent: 8,
      profileComplete: false,
      readyToSubmit: false,
      profileIssues: [{ code: "display_name", field: "displayName", label: "Nome profissional", step: 0 }],
      issues: [{ code: "display_name", field: "displayName", label: "Nome profissional", step: 0 }],
    },
  } }));
  await page.route("**/api/didit/session", (route) => route.fulfill({ json: {
    available: true,
    sessionId: null,
    status: "NOT_STARTED",
    retryAllowed: false,
    url: null,
  } }));
}

test("nome técnico existente é limpo e a interface explica o nome profissional", async ({ page }) => {
  await mockOnboarding(page, "Cadastro de acompanhante");
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 1 de 9", { exact: false })).toBeVisible();
  await expect(page.getByText("Qual nome você quer mostrar aos clientes? *")).toBeVisible();
  await expect(page.getByText("Não precisa ser seu nome de documento.", { exact: false })).toBeVisible();
  await expect(page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...")).toHaveValue("");
});

test("nome profissional vazio ou técnico não permite avançar", async ({ page }) => {
  await mockOnboarding(page);
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Continuar →" }).click();
  await expect(page.locator(".model-validation-summary")).toHaveText("Informe seu nome profissional.");

  await page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...").fill("Cadastro de acompanhante");
  await page.getByRole("button", { name: "Continuar →" }).click();
  await expect(page.locator(".model-validation-summary")).toContainText("Esse nome não pode ser usado");
});

test("rascunho completo continua vinculado à conta e retoma a etapa salva", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/professionals/draft");
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: {
    completion: { profilePercent: 100, profileComplete: true, readyToSubmit: false, profileIssues: [], issues: [] },
  } }));
  await page.addInitScript(({ userId }) => {
    localStorage.setItem(`elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`, JSON.stringify({
      ownerId: userId,
      registrationType: "PROFESSIONAL",
      updatedAt: "2099-01-01T00:00:00.000Z",
      step: 7,
      form: { displayName: "Marina Elite", bio: "A".repeat(80), birthDate: "2000-01-01" },
    }));
  }, { userId: USER_ID });
  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 8 de 9", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verificar minha identidade", exact: true })).toBeVisible();
});

test("rascunho local antigo nao sobrescreve nome e cidade mais novos do banco", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: USER_ID,
    email: "hydration@example.invalid",
    emailVerified: true,
    birthDate: "2000-01-01",
    professional: { ...professional("Nome do banco"), city: "Cidade do banco", updatedAt: "2026-10-22T12:00:00.000Z" },
  } }));
  await page.addInitScript(({ userId }) => {
    localStorage.setItem(`elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`, JSON.stringify({
      ownerId: userId,
      registrationType: "PROFESSIONAL",
      updatedAt: "2026-10-21T12:00:00.000Z",
      step: 0,
      form: { displayName: "Nome local antigo", city: "Cidade local antiga" },
    }));
  }, { userId: USER_ID });

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
  await expect(page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...")).toHaveValue("Nome do banco");
  await expect(page.getByPlaceholder("Selecione sua cidade")).toHaveValue("Cidade do banco");
});

test("rascunho antigo sem proveniencia nao preseleciona servicos", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/professionals/draft");
  await page.route("**/api/professionals/draft", route => route.fulfill({ json: {
    completion: { profilePercent: 100, profileComplete: true, readyToSubmit: false, profileIssues: [], issues: [] },
  } }));
  await page.addInitScript(({ userId }) => {
    localStorage.setItem(`elitemodell_professional_onboarding_v2:${encodeURIComponent(userId)}:PROFESSIONAL`, JSON.stringify({
      ownerId: userId,
      registrationType: "PROFESSIONAL",
      updatedAt: "2099-01-01T00:00:00.000Z",
      step: 3,
      form: { services: ["Acompanhamento"], fetishes: ["Legado invisivel"] },
    }));
  }, { userId: USER_ID });

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Etapa 4 de 9", { exact: false })).toBeVisible();
  await expect(page.getByText("Nenhum serviço selecionado", { exact: true })).toBeVisible();
});

test("troca de conta preserva o rascunho de A e bloqueia dados de A em B", async ({ page }) => {
  const accountA = "professional-account-a";
  const accountB = "professional-account-b";
  await mockOnboarding(page);
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: accountB,
    email: "account-b@example.invalid",
    emailVerified: true,
    birthDate: "2000-01-01",
    lgpdConsent: true,
    termsConsent: true,
    professional: professional(),
  } }));
  await page.addInitScript(({ accountA, accountB }) => {
    const prefix = "elitemodell_professional_onboarding_v2:";
    localStorage.setItem(`${prefix}${encodeURIComponent(accountA)}:PROFESSIONAL`, JSON.stringify({
      ownerId: accountA,
      registrationType: "PROFESSIONAL",
      step: 7,
      form: { displayName: "Nome privado da conta A" },
    }));
    localStorage.setItem(`${prefix}${encodeURIComponent(accountB)}:PROFESSIONAL`, JSON.stringify({
      ownerId: accountA,
      registrationType: "PROFESSIONAL",
      step: 7,
      form: { displayName: "Dados injetados da conta A" },
    }));
  }, { accountA, accountB });

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 1 de 9", { exact: false })).toBeVisible();
  await expect(page.getByPlaceholder("Ex.: Gabriella, Mel, Alice...")).toHaveValue("");
  await expect.poll(() => page.evaluate(({ accountB }) => {
    const prefix = "elitemodell_professional_onboarding_v2:";
    return localStorage.getItem(`${prefix}${encodeURIComponent(accountB)}:PROFESSIONAL`);
  }, { accountB })).toBeNull();
  const storageState = await page.evaluate(({ accountA, accountB }) => {
    const prefix = "elitemodell_professional_onboarding_v2:";
    return {
      accountA: localStorage.getItem(`${prefix}${encodeURIComponent(accountA)}:PROFESSIONAL`),
      accountB: localStorage.getItem(`${prefix}${encodeURIComponent(accountB)}:PROFESSIONAL`),
    };
  }, { accountA, accountB });
  expect(storageState.accountA).toContain("Nome privado da conta A");
  expect(storageState.accountB).toBeNull();
});

test("envio legado incompleto do fluxo de cinco etapas retoma a primeira pendência nas nove etapas", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: USER_ID,
    email: "legacy@example.invalid",
    emailVerified: true,
    birthDate: "2000-01-01",
    lgpdConsent: true,
    termsConsent: true,
    professional: {
      ...professional("Marina Legado"),
      status: "PENDING_REVIEW",
      registrationSubmittedAt: "2026-10-20T12:00:00.000Z",
      completionRulesVersion: 1,
      bio: "Cadastro antigo parcialmente preenchido.",
      kycStatus: "APPROVED",
    },
  } }));
  await page.unroute("**/api/professionals/draft");
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: {
    completion: {
      profilePercent: 36,
      profileComplete: false,
      readyToSubmit: false,
      firstIncompleteStep: 1,
      profileIssues: [{ code: "birth_date", field: "birthDate", label: "Data de nascimento", step: 1 }],
      issues: [{ code: "birth_date", field: "birthDate", label: "Data de nascimento", step: 1 }],
    },
  } }));

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Etapa 2 de 9", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cadastro recebido com sucesso!" })).toHaveCount(0);
  await expect(page.getByText("Seu cadastro anterior foi iniciado em uma versão antiga", { exact: false })).toBeVisible();
});

test("envio atual completo continua na confirmação sem reabrir etapas", async ({ page }) => {
  await mockOnboarding(page);
  await page.unroute("**/api/users/me**");
  await page.route("**/api/users/me**", (route) => route.fulfill({ json: {
    id: USER_ID,
    email: "current@example.invalid",
    emailVerified: true,
    professional: {
      ...professional("Marina Atual"),
      status: "DRAFT",
      registrationSubmittedAt: "2026-10-22T12:00:00.000Z",
      completionRulesVersion: 2,
      kycStatus: "PENDING",
    },
  } }));
  await page.unroute("**/api/professionals/draft");
  await page.route("**/api/professionals/draft", (route) => route.fulfill({ json: {
    completion: { profilePercent: 100, profileComplete: true, readyToSubmit: false, firstIncompleteStep: 7, profileIssues: [], issues: [] },
  } }));

  await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Cadastro recebido com sucesso!" })).toBeVisible();
});

test("primeira etapa não tem overflow no iPhone Safari nem no desktop", async ({ page }, testInfo) => {
  await mockOnboarding(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/profissional/novo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dados básicos" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`full-onboarding-${width}.png`), fullPage: true });
  }
});
