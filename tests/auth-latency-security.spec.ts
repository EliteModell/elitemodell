import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const auth = readFileSync(join(root, "src/lib/auth.ts"), "utf8");
const adultAccess = readFileSync(join(root, "src/lib/adult-content-access.ts"), "utf8");
const stories = readFileSync(join(root, "src/app/api/stories/route.ts"), "utf8");
const reviews = readFileSync(join(root, "src/app/api/reviews/route.ts"), "utf8");

test.describe("contrato de seguranca do auth context minimo", () => {
  test("usuario valido usa uma unica query SQL escalar", () => {
    expect(auth).toContain("loadAuthContext(token.id as string)");
    expect(auth).toContain('FROM ${table("User")} u');
    expect(auth).toContain('LEFT JOIN ${table("Professional")} p');
    expect(auth).toContain("Invalid database schema configured for auth context.");
    expect(auth).not.toContain("clientProfile: { select: { id: true } },\n              hostProfile:");
  });

  test("usuario bloqueado e removido invalidam a sessao", () => {
    expect(auth).toContain("if (!dbUser) return invalidateAuthToken(token)");
    expect(auth).toContain("if (dbUser.blocked)");
    expect(auth).toContain("return invalidateAuthToken(token)");
    expect(auth).toContain('token.id = ""');
    expect(auth).toContain("token.adultVerified = false");
  });

  test("role privilegiada sempre vem do banco atual", () => {
    expect(auth).toContain("hasActiveAdminAssignment");
    expect(auth).toContain('const effectiveRole = dbUser.hasActiveAdminAssignment ? "ADMIN" : dbUser.role');
    expect(auth).toContain("token.role = effectiveRole");
  });

  test("status suspenso/profissional e KYC continuam atuais", () => {
    expect(auth).toContain("token.professionalStatus = dbUser.professionalStatus");
    expect(auth).toContain('dbUser.professionalKycStatus === "APPROVED"');
    expect(auth).toContain("dbUser.professionalVerified");
  });

  test("18+ e consentimento continuam fail-closed", () => {
    expect(auth).toContain('dbUser.clientStatus === "VERIFIED"');
    expect(auth).toContain("!dbUser.lgpdConsent || !dbUser.termsConsent || !dbUser.birthDate");
    expect(adultAccess).toContain("if (!session?.user?.id)");
    expect(adultAccess).toContain("if (!session.user.adultVerified && session.user.role !== \"ADMIN\")");
  });

  test("stories e elegibilidade de reviews reutilizam auth request-scoped", () => {
    expect(stories).toContain("const session = adultAccess.session");
    expect(stories.match(/authorizeAdultContentRequest/g)?.length).toBe(2); // import + uma chamada GET
    expect(reviews).toContain("const session = adultAccess.session");
  });
});
