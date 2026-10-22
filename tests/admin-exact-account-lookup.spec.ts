import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("busca administrativa de conta é exata, restrita e auditada", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");

  expect(source).toContain('requireAdmin("clients:manage")');
  expect(source).toContain('email: { equals: value.toLowerCase(), mode: "insensitive" }');
  expect(source).toContain("return { phone: { in: brazilianPhoneStorageVariants(value) } }");
  expect(source).toContain('action: "ADMIN_ACCESS"');
  expect(source).toContain('createHash("sha256")');
  expect(source).not.toContain("queryRaw");
  expect(source).not.toContain("password: true");
  expect(source).not.toContain("access_token: true");
  expect(source).not.toContain("refresh_token: true");
});

test("exclusao administrativa exige master e confirma os tres identificadores", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");

  expect(source).toContain('requireAdmin("settings:manage")');
  expect(source).toContain('adminRole !== "ADMIN_MASTER"');
  expect(source).toContain('confirmation !== `EXCLUIR ${userId}`');
  expect(source).toContain("user?.email.toLowerCase() === email");
  expect(source).toContain("normalizedPhone(user.phone) === phone");
  expect(source).toContain("buildDeletionPlan(userId)");
  expect(source).toContain("processDataDeletionJob(queued.job.id)");
  expect(source).toContain("processDataDeletionJob(existing.id)");
  expect(source).toContain("export const maxDuration = 300");
  expect(source).toContain('type: "ADMIN_TEST_ACCOUNT_DELETION"');
});
