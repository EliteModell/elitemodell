import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { phoneIdentityLockKey } from "../src/lib/phone-otp";

test.describe("concorrencia da identidade telefonica", () => {
  test("todos os caminhos serializam o mesmo telefone normalizado", () => {
    const verification = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/auth/phone/verify-code/route.ts"),
      "utf8",
    );
    const registration = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/auth/register/route.ts"),
      "utf8",
    );
    const attachment = fs.readFileSync(
      path.join(process.cwd(), "src/lib/professional-phone-registration.ts"),
      "utf8",
    );

    expect(phoneIdentityLockKey("+55 (11) 91793-4340")).toBe("verified-phone:11917934340");
    expect(phoneIdentityLockKey("11917934340")).toBe("verified-phone:11917934340");
    expect(verification).toContain("phoneIdentityLockKey(phone)");
    expect(registration).toContain("phoneIdentityLockKey(pendingProfessionalPhone.phone)");
    expect(attachment).toContain("phoneIdentityLockKey(pending.phone)");
  });

  test("cadastro e vinculacao rejeitam proprietario preexistente em qualquer formato", () => {
    const verification = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/auth/phone/verify-code/route.ts"),
      "utf8",
    );
    const registration = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/auth/register/route.ts"),
      "utf8",
    );
    const attachment = fs.readFileSync(
      path.join(process.cwd(), "src/lib/professional-phone-registration.ts"),
      "utf8",
    );

    expect(registration).toContain("brazilianPhoneStorageVariants(pendingProfessionalPhone.phone)");
    expect(attachment).toContain("brazilianPhoneStorageVariants(pending.phone)");
    expect(verification).toContain("Conflito de identidade: telefone vinculado a mais de uma conta.");
    expect(registration).toContain("Este telefone já está vinculado a outra conta.");
    expect(attachment).toContain("Este telefone já está vinculado a outra conta.");
  });

  test("vinculo e gravacao permanecem na mesma transacao", () => {
    const attachment = fs.readFileSync(
      path.join(process.cwd(), "src/lib/professional-phone-registration.ts"),
      "utf8",
    );
    const activation = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/users/me/activate-professional/route.ts"),
      "utf8",
    );

    expect(attachment).toContain("await prisma.$transaction(async (tx) =>");
    expect(attachment).toContain("await tx.user.update({");
    expect(activation.indexOf("await attachPendingProfessionalPhone(req, session.user.id)")).toBeLessThan(
      activation.indexOf("await ensureProfileForIntent(session.user.id"),
    );
  });
});
