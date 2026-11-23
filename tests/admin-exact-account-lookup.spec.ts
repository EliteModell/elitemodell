import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { clientNameSearchQuery } from "../src/lib/admin-client-name-search";

test("busca administrativa de conta é exata, restrita e auditada", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");

  expect(source).toContain('requireAdmin("clients:manage")');
  expect(source).toContain('email: { equals: value.toLowerCase(), mode: "insensitive" }');
  expect(source).toContain("return { phone: { in: brazilianPhoneStorageVariants(value) } }");
  expect(source).toContain('action: "ADMIN_ACCESS"');
  expect(source).toContain('createHash("sha256")');
  expect(source).not.toContain("queryRawUnsafe");
  expect(source).not.toContain("password: true");
  expect(source).not.toContain("access_token: true");
  expect(source).not.toContain("refresh_token: true");
});

test("pesquisa por nome parametriza texto e pagina sem filtrar clientes bloqueados", () => {
  const query = clientNameSearchQuery("JOÃO Dá SILVA", 30, 30);
  expect(query.values).toEqual(["joao da silva", "joao da silva", 30, 30]);
  expect(query.text).toContain("strpos");
  expect(query.text).not.toContain("blocked");
  expect(query.text).not.toContain("clientStatus");
  expect(query.text).toContain('ORDER BY "createdAt" DESC, id DESC OFFSET');
  const literal = clientNameSearchQuery("Silva%'_", 0, 30);
  expect(literal.text).not.toContain("Silva");
  expect(literal.values[0]).toBe("silva%'_");
});

test("busca mantém filtro na paginação e ações usam o ID da linha", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");
  expect(source).toContain('query={{ q: query }}');
  expect(source).toContain('href="/admin/clientes"');
  expect(source).toContain('where: { id },');
  expect(source).toContain('value={client.blocked ? "unblock" : "block"}');
  expect(source).toContain('exactLookup && total === 1 && clients.length === 1');
});

test("bloqueio e reativação atingem somente o cliente selecionado e são auditados", async () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");
  const compiled = ts.transpileModule(source + "\nexport { toggleClientBlock };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const updates: Array<{ where: { id: string }; data: { blocked: boolean } }> = [];
  const audit: Array<{ action: string; targetId: string }> = [];
  const paths: string[] = [];
  const exports = {} as { toggleClientBlock: (form: FormData) => Promise<void> };
  const mocks: Record<string, unknown> = {
    "@/lib/admin-access": { requireAdmin: async (permission: string) => {
      expect(permission).toBe("clients:manage");
      return { session: { user: { id: "admin-sintetico" } } };
    } },
    "@/lib/prisma": { prisma: { user: { update: async (input: typeof updates[number]) => updates.push(input) } } },
    "@/lib/audit": { logAudit: async (entry: typeof audit[number]) => audit.push(entry) },
    "next/cache": { revalidatePath: (path: string) => paths.push(path) },
  };
  runInNewContext(compiled, { exports, require: (name: string) => mocks[name] ?? {} });
  const form = new FormData();
  form.set("id", "cliente-sintetico");
  for (const action of ["block", "unblock"]) {
    form.set("action", action);
    await exports.toggleClientBlock(form);
  }
  expect(updates.map(({ where, data }) => [where.id, data.blocked])).toEqual([["cliente-sintetico", true], ["cliente-sintetico", false]]);
  expect(audit.map(({ action, targetId }) => [action, targetId])).toEqual([["USER_BLOCKED", "cliente-sintetico"], ["USER_UNBLOCKED", "cliente-sintetico"]]);
  expect(paths.filter((path) => path === "/admin/clientes")).toHaveLength(2);
});

test("exclusao administrativa exige master e confirma os tres identificadores", () => {
  const source = readFileSync("src/app/(dashboard)/admin/clientes/page.tsx", "utf8");
  const worker = readFileSync("src/lib/data-deletion-worker.ts", "utf8");

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
  expect(worker.indexOf("prisma.mediaDepictedPerson.deleteMany")).toBeLessThan(worker.indexOf("prisma.uploadAsset.deleteMany"));
});

test("aviso de recuperacao seleciona somente legado incompleto e e idempotente", () => {
  const source = readFileSync("src/app/(dashboard)/admin/profissionais/page.tsx", "utf8");
  const email = readFileSync("src/lib/professional-extra-email.ts", "utf8");
  expect(source).toContain('status: { in: ["DRAFT", "PENDING_REVIEW"] }');
  expect(source).toContain("registrationSubmittedAt: { not: null }");
  expect(source).toContain("completionRulesVersion: { lt: 2 }");
  expect(source).toContain('reason: { contains: "envio legado incompleto", mode: "insensitive" }');
  expect(source).toContain("if (completion.profileComplete) continue");
  expect(source).toContain("LEGACY_RECOVERY_NOTICE_REASON");
  expect(source).toContain('type: "LEGACY_ONBOARDING_RECOVERED"');
  expect(email).toContain('subject: "Seu cadastro foi liberado para continuar - Elite Modell"');
});
