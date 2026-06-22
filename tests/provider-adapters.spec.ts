import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { POST as sendPhoneCode } from "../src/app/api/auth/phone/send-code/route";
import { prisma } from "../src/lib/prisma";
import { readJsonResponse } from "../src/lib/safe-json-response";
import {
  sendTwilioSmsVerification,
  toBrazilianE164,
  TwilioVerifyProviderError,
} from "../src/lib/twilio-verify";
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

test.describe("Twilio Verify no cadastro profissional", () => {
  test.describe.configure({ mode: "serial" });

  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  };
  const repository = prisma.phoneVerificationCode as unknown as {
    findFirst: (...args: unknown[]) => Promise<unknown>;
    count: (...args: unknown[]) => Promise<number>;
    create: (...args: unknown[]) => Promise<{ id: string }>;
    update: (...args: unknown[]) => Promise<unknown>;
  };
  const originalRepository = {
    findFirst: repository.findFirst,
    count: repository.count,
    create: repository.create,
    update: repository.update,
  };

  function configureTwilio() {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "server-only-token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";
  }

  function request() {
    return new NextRequest("http://localhost/api/auth/phone/send-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.44",
      },
      body: JSON.stringify({
        phone: "(11) 91793-4340",
        accountType: "model",
        channel: "sms",
        termsConsent: true,
        lgpdConsent: true,
        ageConfirmed: true,
        ownershipConfirmed: true,
      }),
    });
  }

  test.beforeEach(() => {
    repository.findFirst = async () => null;
    repository.count = async () => 0;
    repository.create = async () => ({ id: "verification-test" });
    repository.update = async () => ({ id: "verification-test" });
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    repository.findFirst = originalRepository.findFirst;
    repository.count = originalRepository.count;
    repository.create = originalRepository.create;
    repository.update = originalRepository.update;

    if (originalEnvironment.accountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = originalEnvironment.accountSid;
    if (originalEnvironment.authToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = originalEnvironment.authToken;
    if (originalEnvironment.serviceSid === undefined) delete process.env.TWILIO_VERIFY_SERVICE_SID;
    else process.env.TWILIO_VERIFY_SERVICE_SID = originalEnvironment.serviceSid;
  });

  test("envio SMS retorna JSON de sucesso e usa E.164 sem CustomCode", async () => {
    configureTwilio();
    let twilioBody = "";
    globalThis.fetch = async (input, init) => {
      expect(String(input)).toContain("/Services/VA_test/Verifications");
      twilioBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ sid: "VE_test", status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };

    const response = await sendPhoneCode(request());
    const data = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.status).toBe(200);
    expect(data).toMatchObject({ ok: true, message: "Código enviado por SMS" });
    const params = new URLSearchParams(twilioBody);
    expect(params.get("To")).toBe("+5511917934340");
    expect(params.get("Channel")).toBe("sms");
    expect(params.get("RiskCheck")).toBe("disable");
    expect(params.has("CustomCode")).toBe(false);
  });

  test("erro da Twilio retorna JSON amigável", async () => {
    configureTwilio();
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ code: 60200, message: "Invalid parameter To: +5511917934340" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );

    const response = await sendPhoneCode(request());
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual({
      ok: false,
      error: "Não foi possível enviar o código agora. Tente novamente.",
    });
    expect(JSON.stringify(data)).not.toContain("917934340");
  });

  test("ausência de env retorna JSON 503 sem acessar a Twilio", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("não deveria chamar");
    };

    const response = await sendPhoneCode(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Twilio não configurado no servidor",
    });
    expect(called).toBe(false);
  });

  test("normaliza telefone brasileiro para E.164", () => {
    expect(toBrazilianE164("(11) 91793-4340")).toBe("+5511917934340");
    expect(toBrazilianE164("+55 11 91793-4340")).toBe("+5511917934340");
  });

  test("parser do frontend rejeita HTML sem executar response.json", async () => {
    const response = new Response("<!DOCTYPE html><html><body>erro</body></html>", {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    expect(await readJsonResponse(response)).toBeNull();
  });

  test("adaptador sinaliza erro do provedor sem expor credencial", async () => {
    configureTwilio();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Provider unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    await expect(sendTwilioSmsVerification("11917934340")).rejects.toBeInstanceOf(
      TwilioVerifyProviderError,
    );
  });
});
