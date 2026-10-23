import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const auth = readFileSync(join(root, "src/lib/auth.ts"), "utf8");
const adultAccess = readFileSync(join(root, "src/lib/adult-content-access.ts"), "utf8");
const stories = readFileSync(join(root, "src/app/api/stories/route.ts"), "utf8");
const reviews = readFileSync(join(root, "src/app/api/reviews/route.ts"), "utf8");
const emailConfirmation = readFileSync(join(root, "src/app/api/auth/email-confirmation/route.ts"), "utf8");
const phoneVerification = readFileSync(join(root, "src/app/api/auth/phone/verify-code/route.ts"), "utf8");
const professionalActivation = readFileSync(join(root, "src/app/api/users/me/activate-professional/route.ts"), "utf8");
const professionalDraft = readFileSync(join(root, "src/app/api/professionals/draft/route.ts"), "utf8");
const professionalSubmission = readFileSync(join(root, "src/app/api/professionals/route.ts"), "utf8");

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

test.describe("vinculo seguro de e-mail para conta criada por telefone", () => {
  test("nao exige identidade Supabase previa nem troca o e-mail antes da confirmacao", () => {
    expect(emailConfirmation).toContain("isTechnicalPhoneEmail(user.email)");
    expect(emailConfirmation).toContain("supabase.auth.admin.createUser");
    expect(emailConfirmation).toContain("app_metadata: { prismaUserId: user.id, linkedFromPhone: true }");
    expect(emailConfirmation).not.toContain("data: { email: targetEmail, emailVerified: null }");
    expect(auth).toContain("authUser.app_metadata?.prismaUserId");
    expect(auth).toContain("data: { email, emailVerified }");
  });

  test("exige telefone recente e trata conflito sem revelar a outra conta", () => {
    expect(emailConfirmation).toContain("RECENT_PHONE_PROOF_MS");
    expect(emailConfirmation).toContain("hasRecentPhoneProof(user)");
    expect(emailConfirmation).toContain("Este e-mail já está vinculado a outra conta. Utilize outro endereço ou entre em contato com o suporte.");
    expect(emailConfirmation).toContain('blockReason === "Conta excluida e pseudonimizada por solicitacao LGPD."');
    expect(emailConfirmation).toContain('releasedIdentity.email.startsWith("deleted+")');
    expect(emailConfirmation).toContain("supabase.auth.admin.deleteUser(targetAuthUser.id)");
    expect(emailConfirmation).toContain("const initialEmailAssociation = isTechnicalPhoneEmail(user.email) && user.phoneVerified");
    expect(emailConfirmation).toContain("if (!initialEmailAssociation && !hasRecentPhoneProof(user))");
    expect(phoneVerification).toContain("phoneVerifiedAt: new Date()");
    expect(phoneVerification).toContain("phoneVerifiedAt: now");
  });

  test("reconcilia confirmacao entre dispositivos sem liberar outra identidade", () => {
    expect(emailConfirmation).toContain('z.literal("status")');
    expect(emailConfirmation).toContain("findAuthUserForAccount(user.id, user.email)");
    expect(emailConfirmation).toContain("linkedUserId && linkedUserId !== user.id");
    expect(emailConfirmation).toContain("conflict && conflict.id !== user.id");
    expect(emailConfirmation).toContain("emailVerified: new Date(authUser.email_confirmed_at)");
  });

  test("permite retomar rascunho pendente mas mantem envio final protegido", () => {
    expect(professionalActivation).not.toContain("EMAIL_NOT_CONFIRMED");
    expect(professionalDraft).not.toContain("EMAIL_NOT_CONFIRMED");
    expect(professionalSubmission).toContain('code: "email_not_verified"');
    expect(professionalSubmission).toContain("{ status: 428 }");
    expect(professionalActivation).toContain("phoneVerified");
  });
});
