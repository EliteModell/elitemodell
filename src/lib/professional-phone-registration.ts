import type { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createPendingProfessionalPhoneToken,
  verifyPendingProfessionalPhoneToken,
} from "@/lib/phone-otp";

export const PROFESSIONAL_PHONE_REGISTRATION_COOKIE =
  "elitemodell_professional_phone_registration";

export class ProfessionalPhoneRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfessionalPhoneRegistrationError";
  }
}

export function setPendingProfessionalPhoneCookie(
  response: NextResponse,
  phone: string,
  verificationId: string,
) {
  response.cookies.set(
    PROFESSIONAL_PHONE_REGISTRATION_COOKIE,
    createPendingProfessionalPhoneToken(phone, verificationId),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    },
  );
}

export function clearPendingProfessionalPhoneCookie(response: NextResponse) {
  response.cookies.set(PROFESSIONAL_PHONE_REGISTRATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function readPendingProfessionalPhone(req: NextRequest) {
  const token = req.cookies.get(PROFESSIONAL_PHONE_REGISTRATION_COOKIE)?.value;
  if (!token) return null;

  const pending = verifyPendingProfessionalPhoneToken(token);
  if (!pending) {
    throw new ProfessionalPhoneRegistrationError(
      "A validação do telefone expirou. Confirme o WhatsApp novamente.",
    );
  }

  return pending;
}

export async function validatePendingProfessionalPhone(req: NextRequest, userId?: string) {
  const pending = readPendingProfessionalPhone(req);
  if (!pending) return null;

  const verification = await prisma.phoneVerificationCode.findFirst({
    where: {
      id: pending.verificationId,
      phone: pending.phone,
      accountType: "model",
      usedAt: { not: null },
      sentAt: { not: null },
      sendError: null,
    },
    select: { id: true },
  });

  if (!verification) {
    throw new ProfessionalPhoneRegistrationError(
      "A validação do telefone expirou. Confirme o WhatsApp novamente.",
    );
  }

  const phoneOwner = await prisma.user.findFirst({
    where: {
      phone: pending.phone,
      ...(userId ? { id: { not: userId } } : {}),
    },
    select: { id: true },
  });
  if (phoneOwner) {
    throw new ProfessionalPhoneRegistrationError(
      "Este telefone já está vinculado a outra conta.",
    );
  }

  return pending;
}

export async function attachPendingProfessionalPhone(req: NextRequest, userId: string) {
  const pending = await validatePendingProfessionalPhone(req, userId);
  if (!pending) return null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: pending.phone,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    },
  });

  return pending.phone;
}
