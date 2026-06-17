import { expect, test } from "@playwright/test";
import {
  cancelAsaasPayment,
  refundAsaasPayment,
  sanitizeAsaasPayment,
} from "../src/lib/asaas";
import {
  moderateFileContent,
  scanFileForVirus,
} from "../src/lib/moderation-core";

test.describe("adaptadores de fornecedores", () => {
  test.afterEach(() => {
    delete process.env.AV_ENABLED;
    delete process.env.MODERATION_ENABLED;
    delete process.env.AV_HTTP_ENDPOINT;
    delete process.env.AV_HTTP_TOKEN;
    delete process.env.CONTENT_MODERATION_ENDPOINT;
    delete process.env.CONTENT_MODERATION_TOKEN;
    delete process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_ENVIRONMENT;
  });

  test("sem antivirus configurado o arquivo permanece pendente e inseguro", async () => {
    process.env.AV_ENABLED = "false";
    const result = await scanFileForVirus(Buffer.from("arquivo"), "a.txt", "text/plain", { provider: "MANUAL" });
    expect(result.safe).toBe(false);
    expect(result.status).toBe("PENDING");
  });

  test("sem moderacao configurada o conteudo exige revisao humana", async () => {
    process.env.MODERATION_ENABLED = "false";
    const result = await moderateFileContent(Buffer.from("imagem"), "a.jpg", "image/jpeg", { provider: "MANUAL" });
    expect(result.safe).toBe(false);
    expect(result.status).toBe("PENDING");
    expect(result.provider).toBe("MANUAL");
  });

  test("adaptador HTTP valida decisao explicita do antivirus", async () => {
    const originalFetch = globalThis.fetch;
    process.env.AV_ENABLED = "true";
    process.env.AV_HTTP_ENDPOINT = "https://security.invalid/scan";
    process.env.AV_HTTP_TOKEN = "test-token";
    let authorization = "";
    globalThis.fetch = async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") || "";
      return new Response(JSON.stringify({
        safe: true,
        provider: "test-av",
        version: "1.2.3",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      const result = await scanFileForVirus(Buffer.from("ok"), "a.txt", "text/plain", { provider: "HTTP" });
      expect(result).toMatchObject({ safe: true, status: "APPROVED", provider: "test-av", providerVersion: "1.2.3" });
      expect(authorization).toBe("Bearer test-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("cancelamento e reembolso usam endpoints reais do Asaas", async () => {
    const originalFetch = globalThis.fetch;
    process.env.ASAAS_API_KEY = "test-key";
    process.env.ASAAS_ENVIRONMENT = "sandbox";
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    globalThis.fetch = async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method || "GET",
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return new Response(JSON.stringify({
        id: "pay_123",
        status: init?.method === "DELETE" ? "DELETED" : "REFUNDED",
        value: 100,
        refundedValue: 25,
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await cancelAsaasPayment("pay_123");
      await refundAsaasPayment("pay_123", { value: 25, description: "Ajuste aprovado" });
      expect(calls[0]).toMatchObject({ method: "DELETE" });
      expect(calls[0].url).toContain("/payments/pay_123");
      expect(calls[1]).toMatchObject({ method: "POST" });
      expect(calls[1].url).toContain("/payments/pay_123/refund");
      expect(JSON.parse(calls[1].body || "{}")).toEqual({ value: 25, description: "Ajuste aprovado" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("resposta persistivel do Asaas exclui campos nao necessarios", () => {
    expect(sanitizeAsaasPayment({
      id: "pay_123",
      status: "CONFIRMED",
      value: 50,
      billingType: "PIX",
      invoiceUrl: "https://example.invalid/invoice",
    })).toEqual({
      id: "pay_123",
      status: "CONFIRMED",
      value: 50,
      netValue: null,
      refundedValue: null,
      billingType: "PIX",
      externalReference: null,
      dueDate: null,
      paymentDate: null,
      confirmedDate: null,
      invoiceUrl: "https://example.invalid/invoice",
    });
  });
});
