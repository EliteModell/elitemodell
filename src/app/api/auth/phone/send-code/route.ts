export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import {
  OtpDeliveryConfigurationError,
  OtpDeliveryProviderError,
  getOtpDeliveryProvider,
} from "@/lib/otp-delivery";
import {
  OTP_MAX_SENDS_PER_IP_PER_HOUR,
  OTP_MAX_SENDS_PER_PHONE_PER_HOUR,
  OTP_RESEND_SECONDS,
  OTP_TTL_MINUTES,
  PHONE_ACCOUNT_TYPES,
  createOtpCode,
  formatBrazilianPhone,
  hashOtpCode,
  isValidBrazilianMobilePhone,
  normalizeBrazilianPhone,
} from "@/lib/phone-otp";

const schema = z.object({
  phone: z.string().min(10),
  accountType: z.enum(PHONE_ACCOUNT_TYPES).default("client"),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
  termsConsent: z.boolean().default(false),
  lgpdConsent: z.boolean().default(false),
  ageConfirmed: z.boolean().default(false),
  ownershipConfirmed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let verificationId: string | null = null;

  try {
    const body = schema.parse(await req.json());
    const phone = normalizeBrazilianPhone(body.phone);
    const requestIp = getClientIP(req);
    const limited = await enforceRateLimitAsync(
      `otp-send-ip:${requestIp}`,
      OTP_MAX_SENDS_PER_IP_PER_HOUR,
      60 * 60 * 1000,
      "Muitas solicitacoes a partir deste acesso. Tente novamente mais tarde."
    );
    if (limited) return limited;

    if (!isValidBrazilianMobilePhone(phone)) {
      return NextResponse.json({ error: "Informe um celular brasileiro valido." }, { status: 400 });
    }

    if (!body.termsConsent || !body.lgpdConsent) {
      return NextResponse.json(
        { error: "Aceite os Termos de Uso e a Politica de Privacidade para receber o codigo." },
        { status: 400 }
      );
    }

    if (body.accountType !== "client" && (!body.ageConfirmed || !body.ownershipConfirmed)) {
      return NextResponse.json(
        { error: "Confirme os requisitos obrigatorios do cadastro antes de receber o codigo." },
        { status: 400 }
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
            error: "Aguarde alguns segundos para reenviar o codigo.",
            retryAt,
            resendInSeconds: Math.ceil((retryAt.getTime() - Date.now()) / 1000),
          },
          { status: 429 }
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
      return NextResponse.json(
        { error: "Muitas solicitacoes para este telefone. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    if (recentIpCount >= OTP_MAX_SENDS_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "Muitas solicitacoes a partir deste acesso. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const code = createOtpCode();
    const verification = await prisma.phoneVerificationCode.create({
      data: {
        phone,
        accountType: body.accountType,
        channel: body.channel,
        codeHash: hashOtpCode(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        requestIp: requestIp === "unknown" ? null : requestIp,
        termsConsent: body.termsConsent,
        lgpdConsent: body.lgpdConsent,
        ageConfirmed: body.ageConfirmed,
        ownershipConfirmed: body.ownershipConfirmed,
      },
    });
    verificationId = verification.id;

    const delivery = await getOtpDeliveryProvider().send({
      phone,
      code,
      channel: body.channel,
      accountType: body.accountType,
    });

    await prisma.phoneVerificationCode.update({
      where: { id: verification.id },
      data: {
        sentAt: new Date(),
        deliveryProvider: delivery.provider,
        providerMessageId: delivery.providerMessageId ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      phone: formatBrazilianPhone(phone),
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendInSeconds: OTP_RESEND_SECONDS,
      delivery: {
        provider: delivery.provider,
        channel: body.channel,
      },
    });
  } catch (err) {
    if (verificationId) {
      await prisma.phoneVerificationCode
        .update({
          where: { id: verificationId },
          data: { sendError: err instanceof Error ? err.message.slice(0, 500) : "Erro ao enviar codigo." },
        })
        .catch(() => undefined);
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }
    if (err instanceof OtpDeliveryConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof OtpDeliveryProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[phone/send-code]", err);
    return NextResponse.json({ error: "Nao foi possivel enviar o codigo." }, { status: 500 });
  }
}
