import { expect, test } from "@playwright/test";
import {
  isOwnedProfessionalDraft,
  PROFESSIONAL_REGISTRATION_TYPE,
  professionalDraftStorageKey,
} from "../src/lib/professional-draft-storage";
import { brazilianPhoneStorageVariants, normalizeBrazilianPhone } from "../src/lib/phone-otp";
import { readFileSync } from "node:fs";

test.describe("isolamento do rascunho profissional", () => {
  test("contas A e B usam chaves distintas e nunca aceitam o envelope da outra conta", () => {
    const accountA = "account-a";
    const accountB = "account-b";
    const draftA = { ownerId: accountA, registrationType: PROFESSIONAL_REGISTRATION_TYPE, step: 4, form: { displayName: "Conta A" } };
    const draftB = { ownerId: accountB, registrationType: PROFESSIONAL_REGISTRATION_TYPE, step: 0, form: { displayName: "Conta B" } };

    expect(professionalDraftStorageKey(accountA)).not.toBe(professionalDraftStorageKey(accountB));
    expect(isOwnedProfessionalDraft(draftA, accountA)).toBe(true);
    expect(isOwnedProfessionalDraft(draftA, accountB)).toBe(false);
    expect(isOwnedProfessionalDraft(draftB, accountB)).toBe(true);
    expect(isOwnedProfessionalDraft(draftB, accountA)).toBe(false);
  });

  test("tipo de cadastro faz parte obrigatória do vínculo", () => {
    expect(isOwnedProfessionalDraft({ ownerId: "account-a", registrationType: "CLIENT", form: {} }, "account-a")).toBe(false);
  });

  test("OTP e busca administrativa compartilham a mesma normalizacao brasileira", () => {
    const expected = "11987654321";
    for (const value of [expected, "+5511987654321", "(11) 98765-4321"]) {
      expect(normalizeBrazilianPhone(value)).toBe(expected);
      expect(brazilianPhoneStorageVariants(value)).toContain(expected);
      expect(brazilianPhoneStorageVariants(value)).toContain("+5511987654321");
    }
  });

  test("diagnostico usa exclusivamente a identidade da sessao", () => {
    const source = readFileSync("src/app/api/professionals/onboarding-diagnostic/route.ts", "utf8");
    expect(source).toContain("where: { id: session.user.id }");
    expect(source).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(source).not.toContain("searchParams");
    expect(source).not.toContain("request.json");
  });
});
