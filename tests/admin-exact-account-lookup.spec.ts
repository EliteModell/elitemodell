import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("busca administrativa de conta é exata, restrita e auditada", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");

  expect(source).toContain('requireAdmin("clients:manage")');
  expect(source).toContain('email: { equals: value.toLowerCase(), mode: "insensitive" }');
  expect(source).toContain("return { phone: { in: [...variants] } }");
  expect(source).toContain('action: "ADMIN_ACCESS"');
  expect(source).toContain('createHash("sha256")');
  expect(source).not.toContain("queryRaw");
  expect(source).not.toContain("password: true");
  expect(source).not.toContain("access_token: true");
  expect(source).not.toContain("refresh_token: true");
});
