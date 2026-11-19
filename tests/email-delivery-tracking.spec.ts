import { registrationCsvCell, registrationReportFilters } from "../src/lib/registration-admin-report";
import { canFinalizeProfessionalIdentity } from "../src/lib/professional-identity-readiness";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { resendDeliveryUpdate, shouldApplyResendEvent, verifyResendWebhookSignature } from "../src/lib/resend-webhook-security";

test.describe("rastreamento de entrega do Resend", () => {
  test("aceita assinatura Svix valida e rejeita corpo adulterado", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "email_123" } });
    const id = "msg_123";
    const timestamp = "1793106000";
    const secretBytes = Buffer.from("segredo-de-teste");
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const signature = `v1,${createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${payload}`).digest("base64")}`;
    const now = Number(timestamp) * 1000;
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature, secret, now })).toBe(true);
    expect(verifyResendWebhookSignature({ payload: `${payload} `, id, timestamp, signature, secret, now })).toBe(false);
  });

  test("rejeita assinatura antiga para impedir replay", () => {
    expect(verifyResendWebhookSignature({
      payload: "{}", id: "msg_123", timestamp: "100", signature: "v1,invalid", secret: `whsec_${Buffer.from("x").toString("base64")}`, now: 1_000_000,
    })).toBe(false);
  });

  test("mapeia somente eventos de entrega suportados", () => {
    const at = new Date("2026-10-27T12:00:00Z");
    expect(resendDeliveryUpdate("email.sent", at)?.status).toBe("ACCEPTED");
    expect(resendDeliveryUpdate("email.delivered", at)?.status).toBe("DELIVERED");
    expect(resendDeliveryUpdate("email.bounced", at)?.status).toBe("REJECTED");
    expect(resendDeliveryUpdate("email.complained", at)?.status).toBe("REJECTED");
    expect(resendDeliveryUpdate("email.suppressed", at)?.status).toBe("REJECTED");
    expect(resendDeliveryUpdate("email.failed", at)?.status).toBe("FAILED");
    expect(resendDeliveryUpdate("email.opened", at)).toBeNull();
  });

  test("painel apresenta os cinco estados e aprovacao usa o perfil publico", () => {
    const card = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/admin/profissionais/AdminProfessionalCard.tsx"), "utf8");
    const approval = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/admin/profissionais/page.tsx"), "utf8");
    for (const label of ["Aguardando", "Aceito", "Entregue", "Rejeitado", "Falhou"]) expect(card).toContain(label);
    expect(approval).toContain("`/profissionais/${professional.slug}`");
  });

  test("evento antigo ou aceite atrasado nao regride estado terminal", () => {
    const deliveredAt = new Date("2026-10-27T12:05:00Z");
    expect(shouldApplyResendEvent(
      { status: "DELIVERED", lastEventAt: deliveredAt },
      { status: "FAILED", lastEventAt: new Date("2026-10-27T12:04:00Z") },
    )).toBe(false);
    expect(shouldApplyResendEvent(
      { status: "DELIVERED", lastEventAt: deliveredAt },
      { status: "ACCEPTED", lastEventAt: new Date("2026-10-27T12:06:00Z") },
    )).toBe(false);
    expect(shouldApplyResendEvent(
      { status: "DELIVERED", lastEventAt: deliveredAt },
      { status: "REJECTED", lastEventAt: new Date("2026-10-27T12:07:00Z") },
    )).toBe(true);
  });
});


test("export neutraliza formulas e preserva filtros válidos", () => {
  expect(registrationCsvCell("  =1+1")).toBe('"\'  =1+1"');
  expect(registrationCsvCell('texto "legível"')).toBe('"texto ""legível"""');
  expect(registrationReportFilters({ stage: "DRAFT", hours: "48", professional: "cmwjvig9i0005gbbtchxtvg6y" }))
    .toMatchObject({ stage: "DRAFT", hours: "48", professional: "cmwjvig9i0005gbbtchxtvg6y" });
  expect(registrationReportFilters({ stage: "UNKNOWN", hours: "1" })).toMatchObject({ stage: undefined, hours: "24" });
});

test("finalização exige autorização da sessão Didit atual", () => {
  expect(canFinalizeProfessionalIdentity("current", null, "PENDING")).toBe(false);
  expect(canFinalizeProfessionalIdentity("current", "old", "PENDING")).toBe(false);
  expect(canFinalizeProfessionalIdentity("current", "current", "REJECTED")).toBe(false);
  expect(canFinalizeProfessionalIdentity("current", "current", "PENDING")).toBe(true);
  expect(canFinalizeProfessionalIdentity("current", "current", "APPROVED")).toBe(true);
});
