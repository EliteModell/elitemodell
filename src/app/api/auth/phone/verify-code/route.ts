export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordConsentPreference, recordUserAcceptances, registrationDocumentKeys } from "@/lib/legal-acceptance";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/security";
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_VERIFY_ATTEMPTS_PER_IP_WINDOW,
  OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW,
  OTP_TTL_MINUTES,
  PHONE_ACCOUNT_TYPES,
  createPhoneAuthToken,
  emailForPhone,
  formatBrazilianPhone,
  hashOtpCode,
  isValidBrazilianMobilePhone,
  nameForPhoneAccount,
  normalizeBrazilianPhone,
  redirectForPhoneAccount,
  roleForPhoneAccount,
  timingSafeCodeCompare,
} from "@/lib/phone-otp";
import { setPendingProfessionalPhoneCookie } from "@/lib/professional-phone-registration";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().regex(/^\d{4,6}$/),
  accountType: z.enum(PHONE_ACCOUNT_TYPES).default("client"),
  firebaseIdToken: z.string().min(20).optional(),
  termsConsent: z.boolean().optional(),
  lgpdConsent: z.boolean().optional(),
  ageConfirmed: z.boolean().optional(),
  ownershipConfirmed: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  deferAccountCreation: z.boolean().default(false),
});

type VerifiedConsent = {
  termsConsent: boolean;
  lgpdConsent: boolean;
  ageConfirmed: boolean;
  ownershipConfirmed: boolean;
};

async function recordPhoneLegalTrace(user: { id: string; accountType?: string | null }, req: NextRequest, marketingConsent?: boolean) {
  await recordUserAcceptances({
    userId: user.id,
    userCategory: user.accountType,
    documentKeys: registrationDocumentKeys(user.accountType),
    source: "phone-verify",
    acceptanceType: "REGISTRATION",
    req,
  });
  await recordConsentPreference({
    userId: user.id,
    purpose: "PRIVACY_POLICY",
    granted: true,
    source: "phone-verify",
    req,
  });
  if (typeof marketingConsent === "boolean") {
    await recordConsentPreference({
      userId: user.id,
      purpose: "MARKETING",
      granted: marketingConsent,
      source: "phone-verify",
      req,
    });
  }
}

async function verifyFirebasePhoneIdToken(idToken: string, expectedPhone: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("[firebase] NEXT_PUBLIC_FIREBASE_API_KEY ausente no servidor para validar Phone Auth.");
    throw new Error("Firebase nao esta configurado no servidor.");
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("[firebase] Falha ao validar idToken de telefone.", data);
    throw new Error("Nao foi possivel validar o codigo no Firebase.");
  }

  const user = Array.isArray(data.users) ? data.users[0] : null;
  const firebasePhone = typeof user?.phoneNumber === "string" ? user.phoneNumber.replace(/\D/g, "") : "";
  if (firebasePhone !== `55${expectedPhone}`) {
    throw new Error("Telefone validado no Firebase nao corresponde ao telefone informado.");
  }
}

async function persistVerifiedPhone({
  phone,
  accountType,
  consent,
  verificationId,
}: {
  phone: string;
  accountType: (typeof PHONE_ACCOUNT_TYPES)[number];
  consent: VerifiedConsent;
  verificationId?: string;
}) {
  const now = new Date();
  const role = roleForPhoneAccount(accountType);
  const localEmail = emailForPhone(phone, accountType);
  const legacyEmail = `phone_${phone}@sms.elitemodell.local`;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: {
        OR: [
          { phone },
          { email: localEmail },
          { email: legacyEmail },
        ],
      },
    });

    // Proteção contra mistura de tipos: nunca alterar accountType/role de conta existente.
    // Usuário existente pode ter sido criado via outro fluxo — preservar tipo original.
    const preserveExistingType = existing && (
      existing.role === "ADMIN" ||
      existing.accountType === "model" ||
      existing.accountType === "host"
    );

    const savedUser = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            phone,
            phoneVerified: true,
            phoneVerifiedAt: existing.phoneVerifiedAt ?? now,
            // Preservar tipo original se conta já tem tipo definido
            accountType: preserveExistingType ? existing.accountType : accountType,
            role: preserveExistingType ? existing.role : role,
            termsConsent: existing.termsConsent || consent.termsConsent,
            lgpdConsent: existing.lgpdConsent || consent.lgpdConsent,
            consentDate: existing.consentDate ?? now,
          },
        })
      : await tx.user.create({
          data: {
            email: localEmail,
            name: nameForPhoneAccount(accountType),
            phone,
            phoneVerified: true,
            phoneVerifiedAt: now,
            accountType,
            role,
            termsConsent: consent.termsConsent,
            lgpdConsent: consent.lgpdConsent,
            consentDate: now,
          },
        });

    if (verificationId) {
      await tx.phoneVerificationCode.updateMany({
        where: {
          phone,
          accountType,
          usedAt: null,
          id: { not: verificationId },
        },
        data: { usedAt: now },
      });

      await tx.phoneVerificationCode.update({
        where: { id: verificationId },
        data: { usedAt: now, attempts: { increment: 1 }, userId: savedUser.id },
      });
    }

    return savedUser;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizeBrazilianPhone(body.phone);
    const requestIp = getClientIP(req);

    if (!isValidBrazilianMobilePhone(phone)) {
      return NextResponse.json({ error: "Informe um celular brasileiro valido." }, { status: 400 });
    }

    if (body.firebaseIdToken) {
      const consent = {
        termsConsent: Boolean(body.termsConsent),
        lgpdConsent: Boolean(body.lgpdConsent),
        ageConfirmed: Boolean(body.ageConfirmed),
        ownershipConfirmed: Boolean(body.ownershipConfirmed),
      };

      if (!consent.termsConsent || !consent.lgpdConsent) {
        return NextResponse.json(
          { error: "Consentimentos obrigatorios ausentes. Solicite um novo codigo." },
          { status: 400 }
        );
      }

      if (!consent.ageConfirmed || (body.accountType !== "client" && !consent.ownershipConfirmed)) {
        return NextResponse.json(
          { error: "Confirmacoes obrigatorias ausentes. Solicite um novo codigo." },
          { status: 400 }
        );
      }

      const phoneLimit = await checkRateLimitAsync(
        `otp-verify-phone:${body.accountType}:${phone}`,
        OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW,
        15 * 60 * 1000
      );
      const ipLimit = await checkRateLimitAsync(
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

      await verifyFirebasePhoneIdToken(body.firebaseIdToken, phone);

      if (body.deferAccountCreation && body.accountType === "model") {
        const now = new Date();
        const verification = await prisma.phoneVerificationCode.create({
          data: {
            phone,
            accountType: body.accountType,
            channel: "sms",
            codeHash: hashOtpCode(phone, "firebase-phone-auth"),
            expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
            attempts: 1,
            sentAt: now,
            usedAt: now,
            deliveryProvider: "firebase-phone-auth",
            requestIp,
            termsConsent: consent.termsConsent,
            lgpdConsent: consent.lgpdConsent,
            ageConfirmed: consent.ageConfirmed,
            ownershipConfirmed: consent.ownershipConfirmed,
          },
        });

        console.info("[phone/verify-code] firebase_sms_verified", {
          accountType: body.accountType,
          deferAccountCreation: true,
          provider: "firebase-phone-auth",
        });

        const response = NextResponse.json({
          ok: true,
          phone: formatBrazilianPhone(phone),
          phoneVerified: true,
          registrationPending: true,
          redirectTo: "/cadastro?tipo=acompanhante&telefoneValidado=1",
        });
        setPendingProfessionalPhoneCookie(response, phone, verification.id);
        return response;
      }

      const user = await persistVerifiedPhone({
        phone,
        accountType: body.accountType,
        consent,
      });
      await recordPhoneLegalTrace(user, req, body.marketingConsent);
      console.info("[phone/verify-code] firebase_sms_verified", {
        accountType: body.accountType,
        deferAccountCreation: false,
        provider: "firebase-phone-auth",
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
    }

    const phoneLimit = await checkRateLimitAsync(
      `otp-verify-phone:${body.accountType}:${phone}`,
      OTP_MAX_VERIFY_ATTEMPTS_PER_PHONE_WINDOW,
      15 * 60 * 1000
    );
    const ipLimit = await checkRateLimitAsync(
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

    if (!verification.ageConfirmed || (body.accountType !== "client" && !verification.ownershipConfirmed)) {
      return NextResponse.json(
        { error: "Confirmacoes obrigatorias ausentes. Solicite um novo codigo." },
        { status: 400 }
      );
    }

    if (body.deferAccountCreation && body.accountType === "model") {
      await prisma.phoneVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date(), attempts: { increment: 1 } },
      });

      const response = NextResponse.json({
        ok: true,
        phone: formatBrazilianPhone(phone),
        phoneVerified: true,
        registrationPending: true,
        redirectTo: "/cadastro?tipo=acompanhante&telefoneValidado=1",
      });
      setPendingProfessionalPhoneCookie(response, phone, verification.id);
      return response;
    }

    const user = await persistVerifiedPhone({
      phone,
      accountType: body.accountType,
      consent: {
        termsConsent: verification.termsConsent,
        lgpdConsent: verification.lgpdConsent,
        ageConfirmed: verification.ageConfirmed,
        ownershipConfirmed: verification.ownershipConfirmed,
      },
      verificationId: verification.id,
    });
    await recordPhoneLegalTrace(user, req, body.marketingConsent);

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
