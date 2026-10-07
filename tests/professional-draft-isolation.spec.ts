import { expect, test } from "@playwright/test";
import {
  isOwnedProfessionalDraft,
  PROFESSIONAL_REGISTRATION_TYPE,
  professionalDraftStorageKey,
} from "../src/lib/professional-draft-storage";

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
});
