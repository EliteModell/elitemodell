export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const userId = session.user.id;

  const [account, professional, bookings, messages, favorites, payments, reports, acceptances, preferences, requests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, emailVerified: true, phone: true,
        phoneVerified: true, city: true, state: true, accountType: true,
        birthDate: true, role: true, category: true, verified: true,
        clientStatus: true, createdAt: true, updatedAt: true,
        hostProfile: true,
      },
    }),
    prisma.professional.findUnique({
      where: { userId },
      include: { photos: true, specialties: true, schedule: true },
    }),
    prisma.booking.findMany({ where: { guestId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.message.findMany({ where: { senderId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, bookingId: true, amount: true, currency: true, method: true,
        status: true, provider: true, externalReference: true, paidAt: true,
        refundedAt: true, refundAmount: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.report.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.userAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: "desc" },
      include: { version: { select: { version: true, contentHash: true, document: { select: { name: true, type: true } } } } },
    }),
    prisma.consentPreference.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.privacyRequest.findMany({ where: { userId }, orderBy: { requestedAt: "desc" }, include: { events: true } }),
  ]);

  const exportData = {
    generatedAt: new Date().toISOString(),
    subjectId: userId,
    account,
    professional,
    bookings,
    sentMessages: messages,
    favorites,
    payments,
    reportsCreated: reports,
    legalAcceptances: acceptances,
    consentPreferences: preferences,
    privacyRequests: requests,
    note: "Dados de terceiros, segredos, credenciais e informacoes legalmente restritas nao integram esta copia.",
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="elite-modell-dados-${userId}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
