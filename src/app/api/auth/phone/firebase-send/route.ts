export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
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

const FIREBASE_PHONE_PROVIDER = "firebase-phone-auth";

const schema = z.object({
  action: z.enum(["prepare", "sent", "error"]),
  verificationId: z.string().min(5).optional(),
  phone: z.string().min(10),
  accountType: z.enum(PHONE_ACCOUNT_TYPES).default("client"),
  termsConsent: z.boolean().default(false),
  lgpdConsent: z.boolean().default(false),
  ageConfirmed: z.boolean().default(false),
  ownershipConfirmed: z.boolean().default(false),
  error: z.string().max(500).optional(),
});

function cleanSendError(value: string | undefined) {
  if (!value) return "Firebase recusou ou interrompeu a solicitacao de SMS.";
  return value.replace(/\s+/g, " ").slice(0, 500);
}

async function markFirebaseSendResult({
  action,
  verificationId,
  phone,
  accountType,
  error,
}: {
  action: "sent" | "error";
  verificationId: string | undefined;
  phone: string;
  accountType: (typeof PHONE_ACCOUNT_TYPES)[number];
  error?: string;
}) {
  if (!verificationId) {
    return NextResponse.json({ error: "Registro de SMS ausente." }, { status: 400 });
  }

  const update = await prisma.phoneVerificationCode.updateMany({
    where: {
      id: verificationId,
      phone,
      accountType,
      deliveryProvider: FIREBASE_PHONE_PROVIDER,
    },
    data:
      action === "sent"
        ? {
            sentAt: new Date(),
            sendError: null,
          }
        : {
            sendError: cleanSendError(error),
          },
  });

  if (update.count === 0) {
    return NextResponse.json({ error: "Registro de SMS nao encontrado." }, { status: 404 });
  }

  const logPayload = {
    accountType,
    provider: FIREBASE_PHONE_PROVIDER,
    phoneSuffix: phone.slice(-4),
    verificationId,
  };
  if (action === "sent") {
    console.info("[phone/firebase-send] firebase_sms_request_accepted", logPayload);
  } else {
    console.warn("[phone/firebase-send] firebase_sms_request_failed", {
      ...logPayload,
      error: cleanSendError(error),
    });
  }

  return NextResponse.json({ ok: true, provider: FIREBASE_PHONE_PROVIDER });
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizeBrazilianPhone(body.phone);
    const requestIp = getClientIP(req);

    if (!isValidBrazilianMobilePhone(phone)) {
      return NextResponse.json({ error: "Informe um celular brasileiro valido." }, { status: 400 });
    }

    if (body.action !== "prepare") {
      return markFirebaseSendResult({
        action: body.action,
        verificationId: body.verificationId,
        phone,
        accountType: body.accountType,
        error: body.error,
      });
    }

    const limited = await enforceRateLimitAsync(
      `otp-firebase-send-ip:${requestIp}`,
      OTP_MAX_SENDS_PER_IP_PER_HOUR,
      60 * 60 * 1000,
      "Muitas solicitacoes a partir deste acesso. Tente novamente mais tarde.",
    );
    if (limited) return limited;

    if (!body.termsConsent || !body.lgpdConsent) {
      return NextResponse.json(
        { error: "Aceite os Termos de Uso e a Politica de Privacidade para receber o codigo." },
        { status: 400 },
      );
    }

    if (!body.ageConfirmed || (body.accountType !== "client" && !body.ownershipConfirmed)) {
      return NextResponse.json(
        { error: "Confirme os requisitos obrigatorios do cadastro antes de receber o codigo." },
        { status: 400 },
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
      return NextResponse.json(
        { error: "Muitas solicitacoes para este telefone. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    if (recentIpCount >= OTP_MAX_SENDS_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "Muitas solicitacoes a partir deste acesso. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const verification = await prisma.phoneVerificationCode.create({
      data: {
        phone,
        accountType: body.accountType,
        channel: "sms",
        codeHash: hashOtpCode(phone, "firebase-phone-auth-pending"),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        requestIp: requestIp === "unknown" ? null : requestIp,
        deliveryProvider: FIREBASE_PHONE_PROVIDER,
        termsConsent: body.termsConsent,
        lgpdConsent: body.lgpdConsent,
        ageConfirmed: body.ageConfirmed,
        ownershipConfirmed: body.ownershipConfirmed,
      },
    });

    console.info("[phone/firebase-send] firebase_sms_request_prepared", {
      accountType: body.accountType,
      provider: FIREBASE_PHONE_PROVIDER,
      phoneSuffix: phone.slice(-4),
      verificationId: verification.id,
    });

    return NextResponse.json({
      ok: true,
      verificationId: verification.id,
      phone: formatBrazilianPhone(phone),
      provider: FIREBASE_PHONE_PROVIDER,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendInSeconds: OTP_RESEND_SECONDS,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }
    console.error("[phone/firebase-send]", err);
    return NextResponse.json({ error: "Nao foi possivel registrar a solicitacao de SMS." }, { status: 500 });
  }
}
