import { expect, test } from "@playwright/test";
import net from "node:net";
import { NextRequest } from "next/server";
import { POST as sendPhoneCode } from "../src/app/api/auth/phone/send-code/route";
import { POST as prepareFirebasePhone } from "../src/app/api/auth/phone/firebase-send/route";
import { prisma } from "../src/lib/prisma";
import { readJsonResponse } from "../src/lib/safe-json-response";
import {
  checkTwilioVerification,
  getTwilioWhatsAppAvailability,
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

async function withFakeClamd(
  response: string | null,
  run: (port: number) => Promise<void>,
) {
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      if (response !== null) socket.end(`${response}\0`);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake clamd sem porta TCP.");
  try {
    await run(address.port);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test.describe("adaptadores de fornecedores", () => {
  test.afterEach(() => {
    delete process.env.AV_ENABLED;
    delete process.env.MODERATION_ENABLED;
    delete process.env.AV_HTTP_ENDPOINT;
    delete process.env.AV_HTTP_TOKEN;
    delete process.env.CONTENT_MODERATION_ENDPOINT;
    delete process.env.CONTENT_MODERATION_TOKEN;
    delete process.env.CLAMAV_HOST;
    delete process.env.CLAMAV_PORT;
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
        status: "CLEAN",
        provider: "test-av",
        version: "1.2.3",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      const result = await scanFileForVirus(Buffer.from("ok"), "a.txt", "text/plain", { provider: "HTTP" });
      expect(result).toMatchObject({ safe: true, status: "CLEAN", provider: "test-av", providerVersion: "1.2.3" });
      expect(authorization).toBe("Bearer test-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("adaptador HTTP preserva malware confirmado e falha operacional fail-closed", async () => {
    const originalFetch = globalThis.fetch;
    process.env.AV_ENABLED = "true";
    process.env.AV_HTTP_ENDPOINT = "https://security.invalid/scan";
    process.env.AV_HTTP_TOKEN = "test-token";
    try {
      globalThis.fetch = async () => new Response(JSON.stringify({
        safe: false,
        status: "INFECTED",
        provider: "test-av",
      }), { status: 200, headers: { "content-type": "application/json" } });
      await expect(scanFileForVirus(Buffer.from("eicar"), "eicar.com", "application/octet-stream", { provider: "HTTP" }))
        .resolves.toMatchObject({ safe: false, status: "INFECTED", provider: "test-av" });

      globalThis.fetch = async () => new Response(JSON.stringify({
        safe: false,
        status: "TIMEOUT",
        provider: "test-av",
        reason: "controlled timeout",
      }), { status: 200, headers: { "content-type": "application/json" } });
      await expect(scanFileForVirus(Buffer.from("arquivo"), "a.txt", "text/plain", { provider: "HTTP" }))
        .resolves.toMatchObject({ safe: false, status: "ERROR", provider: "test-av" });
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
    whatsAppEnabled: process.env.TWILIO_WHATSAPP_VERIFY_ENABLED,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    whatsAppSender: process.env.TWILIO_WHATSAPP_SENDER,
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

  function request(channel = "sms") {
    return new NextRequest("http://localhost/api/auth/phone/send-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.44",
      },
      body: JSON.stringify({
        phone: "(11) 91793-4340",
        accountType: "model",
        channel,
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
    if (originalEnvironment.whatsAppEnabled === undefined) delete process.env.TWILIO_WHATSAPP_VERIFY_ENABLED;
    else process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = originalEnvironment.whatsAppEnabled;
    if (originalEnvironment.messagingServiceSid === undefined) delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    else process.env.TWILIO_MESSAGING_SERVICE_SID = originalEnvironment.messagingServiceSid;
    if (originalEnvironment.whatsAppSender === undefined) delete process.env.TWILIO_WHATSAPP_SENDER;
    else process.env.TWILIO_WHATSAPP_SENDER = originalEnvironment.whatsAppSender;
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
    expect(data).toMatchObject({
      ok: true,
      message: "Solicitação aceita pela Twilio para entrega via SMS",
    });
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
      code: "SMS_SEND_FAILED",
      error: "Não foi possível enviar o código por SMS agora. Tente novamente.",
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
      code: "SMS_SEND_FAILED",
      error: "Twilio não configurado no servidor",
    });
    expect(called).toBe(false);
  });

  test("normaliza telefone brasileiro para E.164", () => {
    expect(toBrazilianE164("(11) 91793-4340")).toBe("+5511917934340");
    expect(toBrazilianE164("+55 11 91793-4340")).toBe("+5511917934340");
  });

  test("clamd INSTREAM aceita arquivo limpo", async () => {
    await withFakeClamd("stream: OK", async (port) => {
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String(port);
      await expect(scanFileForVirus(Buffer.from("arquivo limpo"), "clean.txt", "text/plain", { provider: "CLAMAV" }))
        .resolves.toMatchObject({ safe: true, status: "CLEAN", provider: "CLAMAV" });
    });
  });

  test("clamd INSTREAM rejeita assinatura EICAR", async () => {
    await withFakeClamd("stream: Win.Test.EICAR_HDB-1 FOUND", async (port) => {
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String(port);
      const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
      await expect(scanFileForVirus(eicar, "eicar.com.txt", "text/plain", { provider: "CLAMAV" }))
        .resolves.toMatchObject({ safe: false, status: "INFECTED", provider: "CLAMAV" });
    });
  });

  test("timeout do clamd permanece fail-closed", async () => {
    await withFakeClamd(null, async (port) => {
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String(port);
      await expect(scanFileForVirus(Buffer.from("arquivo"), "a.txt", "text/plain", { provider: "CLAMAV", timeoutMs: 30 }))
        .resolves.toMatchObject({ safe: false, status: "ERROR", provider: "CLAMAV" });
    });
  });

  test("erro de conexao do clamd permanece fail-closed", async () => {
    process.env.CLAMAV_HOST = "127.0.0.1";
    process.env.CLAMAV_PORT = "1";
    await expect(scanFileForVirus(Buffer.from("arquivo"), "a.txt", "text/plain", { provider: "CLAMAV", timeoutMs: 100 }))
      .resolves.toMatchObject({ safe: false, status: "ERROR", provider: "CLAMAV" });
  });

  test("resposta desconhecida do clamd permanece fail-closed", async () => {
    await withFakeClamd("UNKNOWN", async (port) => {
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String(port);
      await expect(scanFileForVirus(Buffer.from("arquivo"), "a.txt", "text/plain", { provider: "CLAMAV" }))
        .resolves.toMatchObject({ safe: false, status: "ERROR", provider: "CLAMAV" });
    });
  });

  test("erro 60203 informa limite temporário e recuperação automática", async () => {
    configureTwilio();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ code: 60203, message: "Max send attempts reached" }), {
        status: 429,
        headers: { "content-type": "application/json", "Retry-After": "120" },
      });

    const response = await sendPhoneCode(request());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(data).toMatchObject({
      ok: false,
      code: "TWILIO_MAX_SEND_ATTEMPTS",
      resendInSeconds: 120,
    });
  });

  test("bloqueio de entrega 60410 é diferenciado de indisponibilidade genérica", async () => {
    configureTwilio();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ code: 60410, message: "Delivery attempt blocked" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });

    const response = await sendPhoneCode(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "TWILIO_DELIVERY_BLOCKED" });
  });

  test("envio WhatsApp usa o mesmo Twilio Verify Service quando a flag está ativa", async () => {
    configureTwilio();
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = "true";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_expected";
    process.env.TWILIO_WHATSAPP_SENDER = "whatsapp:+14353753445";
    let twilioBody = "";
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/Services/VA_test")) {
        return Response.json({ whatsapp: { msg_service_sid: "MG_expected", from: null } });
      }
      if (url.includes("/v2/Channels/Senders")) {
        return Response.json({ senders: [{ sender_id: "whatsapp:+14353753445", status: "ONLINE" }] });
      }
      if (url.includes("/v1/Services/MG_expected/ChannelSenders")) {
        return Response.json({
          channel_senders: [{ sender: "whatsapp:+14353753445", messaging_service_sid: "MG_expected" }],
        });
      }
      expect(url).toContain("/Services/VA_test/Verifications");
      twilioBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ sid: "VE_whatsapp", status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };

    const response = await sendPhoneCode(request("whatsapp"));
    const data = await response.json();
    const params = new URLSearchParams(twilioBody);

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      ok: true,
      message: "Solicitação aceita pela Twilio para entrega via WhatsApp",
      delivery: { provider: "twilio-verify", channel: "whatsapp" },
    });
    expect(params.get("To")).toBe("+5511917934340");
    expect(params.get("Channel")).toBe("whatsapp");
    expect(params.has("CustomCode")).toBe(false);
  });

  test("WhatsApp desativado não chama a Twilio e mantém SMS disponível", async () => {
    configureTwilio();
    delete process.env.TWILIO_WHATSAPP_VERIFY_ENABLED;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("não deveria chamar");
    };

    const response = await sendPhoneCode(request("whatsapp"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      code: "WHATSAPP_NOT_CONFIGURED",
    });
    expect(called).toBe(false);
  });

  test("WhatsApp só fica disponível após confirmar Verify, Sender ONLINE e Sender Pool", async () => {
    configureTwilio();
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = "true";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_expected";
    process.env.TWILIO_WHATSAPP_SENDER = "whatsapp:+14353753445";

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("verify.twilio.com/v2/Services/VA_test")) {
        return Response.json({
          whatsapp: { msg_service_sid: "MG_expected", from: null },
        });
      }
      if (url.includes("messaging.twilio.com/v2/Channels/Senders")) {
        return Response.json({
          senders: [{
            sid: "XE_sender",
            sender_id: "whatsapp:+14353753445",
            status: "ONLINE",
          }],
        });
      }
      if (url.includes("/v1/Services/MG_expected/ChannelSenders")) {
        return Response.json({
          channel_senders: [{
            sid: "XE_sender",
            sender: "whatsapp:+14353753445",
            messaging_service_sid: "MG_expected",
          }],
        });
      }
      return new Response(null, { status: 404 });
    };

    await expect(getTwilioWhatsAppAvailability()).resolves.toEqual({
      available: true,
      verifyMessagingServiceMatches: true,
      senderOnline: true,
      senderInMessagingService: true,
      reason: "available",
    });
  });

  test("WhatsApp sem credenciais retorna indisponibilidade sem quebrar a consulta de canais", async () => {
    configureTwilio();
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = "true";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_expected";
    process.env.TWILIO_WHATSAPP_SENDER = "whatsapp:+14353753445";
    delete process.env.TWILIO_AUTH_TOKEN;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("Não deve consultar o provedor sem credenciais");
    };

    await expect(getTwilioWhatsAppAvailability()).resolves.toMatchObject({
      available: false,
      reason: "missing-configuration",
    });
    expect(called).toBe(false);
  });

  test("whatsapp.from vazio não invalida uma associação correta", async () => {
    configureTwilio();
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = "true";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_expected";
    process.env.TWILIO_WHATSAPP_SENDER = "whatsapp:+14353753445";

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("verify.twilio.com")) {
        return Response.json({ whatsapp: { msg_service_sid: "MG_expected", from: "" } });
      }
      if (url.includes("/v2/Channels/Senders")) {
        return Response.json({ senders: [{ sender_id: "whatsapp:+14353753445", status: "ONLINE" }] });
      }
      return Response.json({
        channel_senders: [{ sender: "whatsapp:+14353753445", messaging_service_sid: "MG_expected" }],
      });
    };

    expect((await getTwilioWhatsAppAvailability()).available).toBe(true);
  });

  test("WhatsApp permanece oculto quando o Messaging Service do Verify diverge", async () => {
    configureTwilio();
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED = "true";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_expected";
    process.env.TWILIO_WHATSAPP_SENDER = "whatsapp:+14353753445";

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("verify.twilio.com")) {
        return Response.json({ whatsapp: { msg_service_sid: "MG_other", from: null } });
      }
      if (url.includes("/v2/Channels/Senders")) {
        return Response.json({ senders: [{ sender_id: "whatsapp:+14353753445", status: "ONLINE" }] });
      }
      return Response.json({
        channel_senders: [{ sender: "whatsapp:+14353753445", messaging_service_sid: "MG_expected" }],
      });
    };

    await expect(getTwilioWhatsAppAvailability()).resolves.toMatchObject({
      available: false,
      verifyMessagingServiceMatches: false,
      reason: "verify-service-mismatch",
    });
  });

  test("canal inválido é rejeitado antes de chamar a Twilio", async () => {
    configureTwilio();
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("não deveria chamar");
    };

    const response = await sendPhoneCode(request("email"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Dados inválidos." });
    expect(called).toBe(false);
  });

  test("limite antifraude por IP continua bloqueando abuso automatizado", async () => {
    configureTwilio();
    repository.count = async () => 20;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("não deveria chamar");
    };

    const response = await sendPhoneCode(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "TWILIO_RATE_LIMIT" });
    expect(called).toBe(false);
  });

  test("cadastro não aplica limite próprio de quantidade por telefone", async () => {
    configureTwilio();
    const countQueries: unknown[] = [];
    repository.count = async (...args) => {
      countQueries.push(args[0]);
      return 0;
    };
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ sid: "VE_test", status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });

    const response = await sendPhoneCode(request());
    expect(response.status).toBe(200);
    expect(countQueries[0]).toMatchObject({
      where: {
        requestIp: "203.0.113.44",
        sentAt: { not: null },
        sendError: null,
        createdAt: { gte: expect.any(Date) },
      },
    });
    expect((countQueries[0] as { where: Record<string, unknown> }).where).not.toHaveProperty("phone");
  });

  test("cadastro de cliente no Firebase também não limita quantidade por telefone", async () => {
    const countQueries: unknown[] = [];
    repository.count = async (...args) => {
      countQueries.push(args[0]);
      return 0;
    };

    const response = await prepareFirebasePhone(new NextRequest("http://localhost/api/auth/phone/firebase-send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.46" },
      body: JSON.stringify({
        action: "prepare",
        phone: "11917934340",
        accountType: "client",
        termsConsent: true,
        lgpdConsent: true,
        ageConfirmed: true,
      }),
    }));

    expect(response.status).toBe(200);
    expect(countQueries).toHaveLength(1);
    expect(countQueries[0]).toMatchObject({ where: { requestIp: "203.0.113.46" } });
    expect((countQueries[0] as { where: Record<string, unknown> }).where).not.toHaveProperty("phone");
  });

  test("número volta a receber após o intervalo mínimo de reenvio", async () => {
    configureTwilio();
    repository.findFirst = async () => ({ createdAt: new Date(Date.now() - 61 * 1000) });
    repository.count = async () => 0;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response(JSON.stringify({ sid: "VE_recovered", status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };

    const response = await sendPhoneCode(request());
    expect(response.status).toBe(200);
    expect(called).toBe(true);
  });

  test("SMS e WhatsApp compartilham a mesma VerificationCheck", async () => {
    configureTwilio();
    let requestUrl = "";
    let requestBody = "";
    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ sid: "VE_check", status: "approved" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await checkTwilioVerification("11917934340", "123456");
    const params = new URLSearchParams(requestBody);
    expect(requestUrl).toContain("/Services/VA_test/VerificationCheck");
    expect(params.get("To")).toBe("+5511917934340");
    expect(params.get("Code")).toBe("123456");
    expect(result.approved).toBe(true);
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
