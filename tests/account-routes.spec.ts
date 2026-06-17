import { test, expect } from "@playwright/test";
import {
  ACCOUNT_ROUTES,
  accountHomePathFromSession,
  postLoginPathFromUser,
  shouldUseClientArea,
} from "../src/lib/account-routes";

test.describe("Rotas de conta", () => {
  test("login como cliente prevalece sobre cadastro profissional pendente", () => {
    const mixedAccountUser = {
      role: "GUEST",
      accountType: "model",
      category: "MULHER",
      professional: { status: "PENDING_REVIEW" },
      properties: [],
    };

    expect(postLoginPathFromUser(mixedAccountUser, "cliente")).toBe(ACCOUNT_ROUTES.dashboardCliente);
    expect(postLoginPathFromUser(mixedAccountUser, "profissional")).toBe(ACCOUNT_ROUTES.verificacaoAcompanhante);
    expect(postLoginPathFromUser(mixedAccountUser)).toBe(ACCOUNT_ROUTES.analiseAcompanhante);
  });

  test("sessao ativa como cliente nao abre painel profissional pendente", () => {
    expect(
      accountHomePathFromSession({
        role: "GUEST",
        accountType: "model",
        activeProfileType: "CLIENTE",
        professionalStatus: "PENDING_REVIEW",
      }),
    ).toBe(ACCOUNT_ROUTES.dashboardCliente);
  });

  test("area cliente continua disponivel para conta mista com perfil cliente", () => {
    expect(shouldUseClientArea({ activeProfileType: "CLIENTE", hasClientProfile: false })).toBe(true);
    expect(shouldUseClientArea({ activeProfileType: "PROFESSIONAL", hasClientProfile: true })).toBe(true);
    expect(shouldUseClientArea({ activeProfileType: "PROFESSIONAL", hasClientProfile: false })).toBe(false);
  });
});
