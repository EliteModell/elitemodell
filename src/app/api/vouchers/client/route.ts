export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseRegistrationVouchersForUser, updateExpiredVouchers, VOUCHER_STATUS_LABEL, VOUCHER_VISITOR_COOKIE } from "@/lib/voucher-roulette";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const pageParam = Number(searchParams.get("page") ?? 1);
  const limitParam = Number(searchParams.get("limit") ?? 30);
  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limit = Number.isFinite(limitParam) ? Math.min(60, Math.max(1, Math.floor(limitParam))) : 30;

  await updateExpiredVouchers();
  await releaseRegistrationVouchersForUser({
    userId: session.user.id,
    visitorId: req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? null,
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });
  const phone = user?.phone ? user.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") : null;

  const vouchers = await prisma.clientVoucher.findMany({
    where: {
      OR: [
        { clientId: session.user.id },
        ...(phone ? [{ recipientPhone: phone }, { whatsapp: phone }] : []),
      ],
    },
    select: {
      id: true,
      code: true,
      value: true,
      status: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
      requiresPayment: true,
      paymentStatus: true,
      prize: { select: { id: true, name: true, type: true, value: true } },
      appointment: { select: { id: true, date: true, professional: { select: { displayName: true, slug: true } } } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({
    vouchers: vouchers.map((voucher) => ({
      ...voucher,
      statusLabel: VOUCHER_STATUS_LABEL[voucher.status] ?? voucher.status,
      participantOnly: true,
    })),
  });
}
