export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brazilianPhoneStorageVariants, normalizeBrazilianPhone } from "@/lib/phone-otp";

function maskEmail(value: string) {
  const [local, domain = ""] = value.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: string | null) {
  const phone = normalizeBrazilianPhone(value ?? "");
  return phone.length === 11 ? `(${phone.slice(0, 2)}) *****-${phone.slice(-4)}` : "nao informado";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      phoneVerified: true,
      emailVerified: true,
      accountType: true,
      professional: {
        select: {
          id: true,
          status: true,
          displayName: true,
          city: true,
          updatedAt: true,
          registrationSubmittedAt: true,
          completionRulesVersion: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Conta da sessao nao encontrada." }, { status: 404 });

  const phoneMatches = user.phone
    ? await prisma.user.findMany({
        where: { phone: { in: brazilianPhoneStorageVariants(user.phone) } },
        take: 3,
        select: { id: true },
      })
    : [];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    session: {
      userId: user.id,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      phoneVerified: user.phoneVerified,
      emailVerified: Boolean(user.emailVerified),
      accountType: user.accountType,
      normalizedPhoneOwnerCount: phoneMatches.length,
      sessionOwnsNormalizedPhone: phoneMatches.some((match) => match.id === user.id),
    },
    professional: user.professional ? {
      id: user.professional.id,
      status: user.professional.status,
      completionRulesVersion: user.professional.completionRulesVersion,
      registrationSubmittedAt: user.professional.registrationSubmittedAt,
      updatedAt: user.professional.updatedAt,
      fields: {
        displayName: { value: user.professional.displayName, source: "database:Professional.displayName" },
        city: { value: user.professional.city, source: "database:Professional.city" },
      },
    } : null,
    serverDraft: {
      storage: "Professional",
      separateDraftRecord: false,
      ownerId: user.id,
    },
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
