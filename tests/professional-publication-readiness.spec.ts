import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { buildEmailAuthCallbackUrl, canonicalizeRequestedEmailCallback } from "../src/lib/email-auth-callback";
import { professionalApprovalEmailIdempotencyKey, professionalPublicationEmailIdempotencyKey, professionalSubmissionReceiptIdempotencyKey } from "../src/lib/email-idempotency";

test.describe("prontidão da publicação profissional", () => {
  test("callback de confirmação usa domínio canônico e rejeita redirect externo", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.elitemodell.com.br";
    try {
      const params = new URLSearchParams({
        returnUrl: "/profissional/novo",
        role: "profissional",
        flow: "cadastro",
      });
      expect(buildEmailAuthCallbackUrl(params)).toBe(
        "https://www.elitemodell.com.br/auth/callback?returnUrl=%2Fprofissional%2Fnovo&role=profissional&flow=cadastro",
      );
      expect(() => canonicalizeRequestedEmailCallback("https://malicioso.example/outro"))
        .toThrow("invalid_auth_callback_path");
      expect(canonicalizeRequestedEmailCallback("https://alias.example/auth/callback?returnUrl=//malicioso.example&role=profissional"))
        .toBe("https://www.elitemodell.com.br/auth/callback?role=profissional");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });

  test("chave do comprovante é estável por anúncio", () => {
    const first = professionalSubmissionReceiptIdempotencyKey("profile_123");
    expect(first).toBe("professional-submission/profile_123");
    expect(professionalSubmissionReceiptIdempotencyKey("profile_123")).toBe(first);
    expect(professionalSubmissionReceiptIdempotencyKey("profile_456")).not.toBe(first);
  });

  test("publicação possui chave própria e mensagens somente após ACTIVE", () => {
    expect(professionalPublicationEmailIdempotencyKey("profile_123")).toBe("professional-publication/profile_123");
    expect(professionalApprovalEmailIdempotencyKey("profile_123")).not.toBe(professionalPublicationEmailIdempotencyKey("profile_123"));
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"), "utf8");
    const email = fs.readFileSync(path.join(process.cwd(), "src/lib/auth-email.ts"), "utf8");
    expect(page).toContain("Parabéns! Seu perfil está liberado!");
    expect(page).toContain("Seu perfil foi enviado e agora está em análise pela equipe Elite Modell.");
    expect(email).toContain("💜 Bem-vinda à Elite Modell! Seu perfil está no ar!");
    expect(email).toContain("Acessar meu perfil");
    expect(email).toContain("professionalPublicationEmailIdempotencyKey(professionalId)");
  });

  test("migração do comprovante é aditiva e possui unicidade, índice e FK", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "prisma/migrations/20260919173000_professional_submission_receipt/migration.sql"),
      "utf8",
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "ProfessionalSubmissionReceipt"');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalSubmissionReceipt_professionalId_key"');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "ProfessionalSubmissionReceipt_status_updatedAt_idx"');
    expect(sql).toContain('REFERENCES "Professional"("id")');
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+"User")\b/i);
  });

  test("envio final persiste o comprovante antes da entrega e registra falhas", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");
    const delivery = fs.readFileSync(path.join(process.cwd(), "src/lib/professional-submission-receipt.ts"), "utf8");
    const email = fs.readFileSync(path.join(process.cwd(), "src/lib/auth-email.ts"), "utf8");

    const transactionAt = route.indexOf("prisma.$transaction");
    const receiptRecordAt = route.indexOf("professionalSubmissionReceipt.upsert", transactionAt);
    const providerDeliveryAt = route.indexOf("deliverProfessionalSubmissionReceipt", receiptRecordAt);
    expect(transactionAt).toBeGreaterThan(-1);
    expect(receiptRecordAt).toBeGreaterThan(transactionAt);
    expect(providerDeliveryAt).toBeGreaterThan(receiptRecordAt);
    expect(delivery).toContain('data: { status: "FAILED", lastError: "provider_delivery_failed" }');
    expect(delivery).toContain('data: { status: "SENT", providerId, sentAt: new Date(), lastError: null }');
    expect(route).toContain("publication.blockers.map((blocker) => blocker.label)");
    expect(route).toContain("markSubmissionReceiptNotRequired");
    expect(email).toContain("Agora nossa equipe irá analisar suas informações, fotos, identidade");
    expect(email).toContain("em até 3 dias úteis");
    expect(email).toContain("mensagem aceita pelo provedor");
    expect(email).toContain('"Idempotency-Key"');
    expect(route).not.toMatch(/professionalSubmissionReceipt\.(?:delete|deleteMany)/);
  });
});
