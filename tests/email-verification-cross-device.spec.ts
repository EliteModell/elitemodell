import { expect, test } from "@playwright/test";
import { createEmailSignupSuccessPayload, createEmailVerificationAttempt, verifyEmailVerificationAttempt } from "../src/lib/email-verification-attempt-core";
import { buildEmailAuthCallbackUrl } from "../src/lib/email-auth-callback";

test.describe("confirmacao de email entre dispositivos", () => {
  test.beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "email-verification-test-secret-32-characters";
  });

  test("token vincula a tentativa ao usuario e email exatos", () => {
    const token = createEmailVerificationAttempt({ userId: "supabase-user-a", email: "Pessoa@Example.com", attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00" });
    expect(verifyEmailVerificationAttempt(token)).toMatchObject({ userId: "supabase-user-a", email: "pessoa@example.com", attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00" });
  });

  test("resposta do cadastro entrega somente o token de acompanhamento previsto", () => {
    const payload = createEmailSignupSuccessPayload({
      userId: "supabase-user-a",
      email: "Pessoa@Example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
      actionType: "signup",
    });
    expect(payload).toMatchObject({ ok: true, email: "pessoa@example.com", actionType: "signup" });
    expect(verifyEmailVerificationAttempt(payload.verificationToken)).toMatchObject({
      userId: "supabase-user-a",
      email: "pessoa@example.com",
      attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00",
    });
    expect(Object.keys(payload).sort()).toEqual(["actionType", "email", "ok", "verificationToken"]);
  });

  test("token alterado ou expirado nao e aceito", () => {
    const token = createEmailVerificationAttempt({ userId: "supabase-user-a", email: "pessoa@example.com", attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00" });
    const [payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    decoded.userId = "supabase-user-b";
    const altered = Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url");
    expect(verifyEmailVerificationAttempt(`${altered}.${signature}`)).toBeNull();
    expect(verifyEmailVerificationAttempt(createEmailVerificationAttempt({ userId: "a", email: "a@example.com", attemptId: "a703cc70-d73a-4b5f-bad7-fea3a725ff00" }, -1))).toBeNull();
  });

  test("callback preserva somente um identificador de tentativa valido", () => {
    const params = new URLSearchParams({ flow: "cadastro", attempt: "a703cc70-d73a-4b5f-bad7-fea3a725ff00" });
    expect(buildEmailAuthCallbackUrl(params)).toContain("attempt=a703cc70-d73a-4b5f-bad7-fea3a725ff00");
    params.set("attempt", "invalido<script>");
    expect(buildEmailAuthCallbackUrl(params)).not.toContain("attempt=");
  });
});
