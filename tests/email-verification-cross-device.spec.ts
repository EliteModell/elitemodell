import { expect, test } from "@playwright/test";
import { createEmailVerificationAttempt, verifyEmailVerificationAttempt } from "../src/lib/email-verification-attempt";

test.describe("confirmacao de email entre dispositivos", () => {
  test.beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "email-verification-test-secret-32-characters";
  });

  test("token vincula a tentativa ao usuario e email exatos", () => {
    const token = createEmailVerificationAttempt({
      userId: "supabase-user-a",
      email: "Pessoa@Example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
    });

    expect(verifyEmailVerificationAttempt(token)).toMatchObject({
      userId: "supabase-user-a",
      email: "pessoa@example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
    });
  });

  test("token alterado ou de outra tentativa nao e aceito", () => {
    const token = createEmailVerificationAttempt({
      userId: "supabase-user-a",
      email: "pessoa@example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
    });
    const [payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    decoded.userId = "supabase-user-b";
    const alteredPayload = Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url");

    expect(verifyEmailVerificationAttempt(`${alteredPayload}.${signature}`)).toBeNull();
    expect(verifyEmailVerificationAttempt(`${token}extra`)).toBeNull();
  });

  test("tentativa expirada exige novo email", () => {
    const token = createEmailVerificationAttempt({
      userId: "supabase-user-a",
      email: "pessoa@example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
    }, -1);

    expect(verifyEmailVerificationAttempt(token)).toBeNull();
  });
});
