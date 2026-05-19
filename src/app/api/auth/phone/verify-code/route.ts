export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/security";
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_VERIFY_ATTEMPTS_PER_IP_WINDOW,
  OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW,
  PHONE_ACCOUNT_TYPES,
  createPhoneAuthToken,
  emailForPhone,
  formatBrazilianPhone,
  isValidBrazilianMobilePhone,
  nameForPhoneAccount,
  normalizeBrazilianPhone,
  redirectForPhoneAccount,
  roleForPhoneAccount,
  timingSafeCodeCompare,
} from "@/lib/phone-otp";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().regex(/^\d{4,6}$/),
  accountType: z.enum(PHONE_ACCOUNT_TYPES).default("client"),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizeBrazilianPhone(body.phone);
    const requestIp = getClientIP(req);

    if (!isValidBrazilianMobilePhone(phone)) {
      return NextResponse.json({ error: "Informe um celular brasileiro valido." }, { status: 400 });
    }

    const phoneLimit = checkRateLimit(
      `otp-verify-phone:${body.accountType}:${phone}`,
      OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW,
      15 * 60 * 1000
    );
    const ipLimit = checkRateLimit(
      `otp-verify-ip:${requestIp}`,
      OTP_MAX_VERIFY_ATTEMPTS_PER_IP_WINDOW,
      15 * 60 * 1000
    );

    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de verificacao. Solicite um novo codigo mais tarde." },
        { status: 429 }
      );
    }

    const verification = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        accountType: body.accountType,
        usedAt: null,
        sentAt: { not: null },
        sendError: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ error: "Codigo expirado. Solicite um novo codigo." }, { status: 400 });
    }

    if (verification.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Muitas tentativas. Solicite um novo codigo." },
        { status: 429 }
      );
    }

    const matches = timingSafeCodeCompare(phone, body.code, verification.codeHash);
    if (!matches) {
      await prisma.phoneVerificationCode.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Codigo incorreto. Confira e tente novamente." }, { status: 400 });
    }

    if (!verification.termsConsent || !verification.lgpdConsent) {
      return NextResponse.json(
        { error: "Consentimentos obrigatorios ausentes. Solicite um novo codigo." },
        { status: 400 }
      );
    }

    if (body.accountType !== "client" && (!verification.ageConfirmed || !verification.ownershipConfirmed)) {
      return NextResponse.json(
        { error: "Confirmacoes obrigatorias ausentes. Solicite um novo codigo." },
        { status: 400 }
      );
    }

    const now = new Date();
    const role = roleForPhoneAccount(body.accountType);
    const localEmail = emailForPhone(phone, body.accountType);
    const legacyEmail = `phone_${phone}@sms.elitemodell.local`;

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: {
          OR: [
            { phone },
            { email: localEmail },
            { email: legacyEmail },
          ],
        },
      });

      const savedUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              phone,
              phoneVerified: true,
              phoneVerifiedAt: existing.phoneVerifiedAt ?? now,
              accountType: existing.role === "ADMIN" ? existing.accountType : body.accountType,
              role: existing.role === "ADMIN" ? "ADMIN" : role,
              termsConsent: existing.termsConsent || verification.termsConsent,
              lgpdConsent: existing.lgpdConsent || verification.lgpdConsent,
              consentDate: existing.consentDate ?? now,
            },
          })
        : await tx.user.create({
            data: {
              email: localEmail,
              name: nameForPhoneAccount(body.accountType),
              phone,
              phoneVerified: true,
              phoneVerifiedAt: now,
              accountType: body.accountType,
              role,
              termsConsent: verification.termsConsent,
              lgpdConsent: verification.lgpdConsent,
              consentDate: now,
            },
          });

      await tx.phoneVerificationCode.updateMany({
        where: {
          phone,
          accountType: body.accountType,
          usedAt: null,
          id: { not: verification.id },
        },
        data: { usedAt: now },
      });

      await tx.phoneVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: now, attempts: { increment: 1 }, userId: savedUser.id },
      });

      if (body.accountType === "host" && savedUser.role !== "ADMIN") {
        await tx.hostProfile.upsert({
          where: { userId: savedUser.id },
          create: { userId: savedUser.id },
          update: {},
        });
      }

      return savedUser;
    });

    return NextResponse.json({
      ok: true,
      phone: formatBrazilianPhone(phone),
      phoneVerified: true,
      phoneVerifiedAt: user.phoneVerifiedAt,
      accountType: body.accountType,
      authToken: createPhoneAuthToken(user.id, phone),
      redirectTo: redirectForPhoneAccount(body.accountType),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }
    console.error("[phone/verify-code]", err);
    return NextResponse.json({ error: "Nao foi possivel verificar o codigo." }, { status: 500 });
  }
}
