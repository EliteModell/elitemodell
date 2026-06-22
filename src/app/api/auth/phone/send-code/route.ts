export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import {
  TWILIO_NOT_CONFIGURED_ERROR,
  TwilioVerifyConfigurationError,
  TwilioVerifyProviderError,
  assertTwilioVerifyConfigured,
  maskPhone,
  sendTwilioSmsVerification,
  toBrazilianE164,
  twilioVerifyEnvironmentStatus,
} from "@/lib/twilio-verify";
import {
  OTP_MAX_SENDS_PER_IP_PER_HOUR,
  OTP_MAX_SENDS_PER_PHONE_PER_HOUR,
  OTP_RESEND_SECONDS,
  OTP_TTL_MINUTES,
  PHONE_ACCOUNT_TYPES,
  formatBrazilianPhone,
  hashOtpCode,
  isValidBrazilianMobilePhone,
  normalizeBrazilianPhone,
} from "@/lib/phone-otp";

const schema = z.object({
  phone: z.string().min(10),
  accountType: z.enum(PHONE_ACCOUNT_TYPES).default("client"),
  channel: z.literal("sms").default("sms"),
  termsConsent: z.boolean().default(false),
  lgpdConsent: z.boolean().default(false),
  ageConfirmed: z.boolean().default(false),
  ownershipConfirmed: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
});

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export async function POST(req: NextRequest) {
  let verificationId: string | null = null;
  let maskedPhone = "desconhecido";

  try {
    const body = schema.parse(await req.json());
    const phone = normalizeBrazilianPhone(body.phone);
    const requestIp = getClientIP(req);
    const environment = twilioVerifyEnvironmentStatus();

    if (isValidBrazilianMobilePhone(phone)) {
      maskedPhone = maskPhone(toBrazilianE164(phone));
    }

    console.info("[phone/send-code] request", {
      endpoint: "/api/auth/phone/send-code",
      phone: maskedPhone,
      channel: "sms",
      hasTwilioAccountSid: environment.hasAccountSid,
      hasTwilioAuthToken: environment.hasAuthToken,
      hasTwilioVerifyServiceSid: environment.hasVerifyServiceSid,
    });

    if (!isValidBrazilianMobilePhone(phone)) {
      return jsonError("Informe um celular brasileiro válido.", 400);
    }

    assertTwilioVerifyConfigured();

    const rateLimitMessage = "Muitas solicitações a partir deste acesso. Tente novamente mais tarde.";
    const limited = await enforceRateLimitAsync(
      "otp-send-ip:" + requestIp,
      OTP_MAX_SENDS_PER_IP_PER_HOUR,
      60 * 60 * 1000,
      rateLimitMessage,
    );
    if (limited) {
      return jsonError(rateLimitMessage, 429, {
        "Retry-After": limited.headers.get("Retry-After") ?? "60",
      });
    }

    if (!body.termsConsent || !body.lgpdConsent) {
      return jsonError(
        "Aceite os Termos de Uso e a Política de Privacidade para receber o código.",
        400,
      );
    }

    if (!body.ageConfirmed || (body.accountType !== "client" && !body.ownershipConfirmed)) {
      return jsonError(
        "Confirme os requisitos obrigatórios do cadastro antes de receber o código.",
        400,
      );
    }

    const latest = await prisma.phoneVerificationCode.findFirst({
      where: { phone, accountType: body.accountType },
      orderBy: { createdAt: "desc" },
    });

    if (latest) {
      const retryAt = new Date(latest.createdAt.getTime() + OTP_RESEND_SECONDS * 1000);
      if (retryAt > new Date()) {
        return NextResponse.json(
          {
            ok: false,
            error: "Aguarde alguns segundos para reenviar o código.",
            retryAt,
            resendInSeconds: Math.ceil((retryAt.getTime() - Date.now()) / 1000),
          },
          { status: 429 },
        );
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentPhoneCount, recentIpCount] = await Promise.all([
      prisma.phoneVerificationCode.count({
        where: { phone, accountType: body.accountType, createdAt: { gte: oneHourAgo } },
      }),
      requestIp === "unknown"
        ? Promise.resolve(0)
        : prisma.phoneVerificationCode.count({
            where: { requestIp, createdAt: { gte: oneHourAgo } },
          }),
    ]);

    if (recentPhoneCount >= OTP_MAX_SENDS_PER_PHONE_PER_HOUR) {
      return jsonError("Muitas solicitações para este telefone. Tente novamente mais tarde.", 429);
    }
    if (recentIpCount >= OTP_MAX_SENDS_PER_IP_PER_HOUR) {
      return jsonError(rateLimitMessage, 429);
    }

    const verification = await prisma.phoneVerificationCode.create({
      data: {
        phone,
        accountType: body.accountType,
        channel: "sms",
        codeHash: hashOtpCode(phone, "twilio-verify-managed"),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        requestIp: requestIp === "unknown" ? null : requestIp,
        termsConsent: body.termsConsent,
        lgpdConsent: body.lgpdConsent,
        ageConfirmed: body.ageConfirmed,
        ownershipConfirmed: body.ownershipConfirmed,
      },
    });
    verificationId = verification.id;

    const delivery = await sendTwilioSmsVerification(phone);

    console.info("[phone/send-code] twilio_response", {
      endpoint: "/api/auth/phone/send-code",
      phone: maskPhone(delivery.to),
      channel: "sms",
      provider: "twilio-verify",
      status: delivery.status,
      verificationSidSuffix: delivery.sid?.slice(-6),
    });

    await prisma.phoneVerificationCode.update({
      where: { id: verification.id },
      data: {
        sentAt: new Date(),
        deliveryProvider: "twilio-verify",
        providerMessageId: delivery.sid ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Código enviado por SMS",
      phone: formatBrazilianPhone(phone),
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendInSeconds: OTP_RESEND_SECONDS,
      delivery: { provider: "twilio-verify", channel: "sms" },
    });
  } catch (err) {
    if (verificationId) {
      await prisma.phoneVerificationCode
        .update({
          where: { id: verificationId },
          data: {
            sendError: err instanceof Error ? err.message.slice(0, 500) : "Erro ao enviar código.",
          },
        })
        .catch(() => undefined);
    }

    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return jsonError("Dados inválidos.", 400);
    }
    if (err instanceof TwilioVerifyConfigurationError) {
      console.error("[phone/send-code] twilio_configuration", {
        endpoint: "/api/auth/phone/send-code",
        phone: maskedPhone,
        channel: "sms",
        ...twilioVerifyEnvironmentStatus(),
      });
      return jsonError(TWILIO_NOT_CONFIGURED_ERROR, 503);
    }
    if (err instanceof TwilioVerifyProviderError) {
      console.error("[phone/send-code] twilio_error", {
        endpoint: "/api/auth/phone/send-code",
        phone: maskedPhone,
        channel: "sms",
        status: err.status,
        providerCode: err.providerCode,
        message: err.message,
      });
      return jsonError("Não foi possível enviar o código agora. Tente novamente.", 502);
    }

    console.error("[phone/send-code] unexpected_error", {
      endpoint: "/api/auth/phone/send-code",
      phone: maskedPhone,
      channel: "sms",
      error: err instanceof Error ? err.message : "Erro desconhecido",
    });
    return jsonError("Não foi possível enviar o código agora. Tente novamente.", 500);
  }
}
