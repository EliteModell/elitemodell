export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseRegistrationVouchersForUser, updateExpiredVouchers, VOUCHER_STATUS_LABEL, VOUCHER_VISITOR_COOKIE } from "@/lib/voucher-roulette";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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
    include: { prize: true, appointment: { select: { id: true, date: true, professional: { select: { displayName: true, slug: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    vouchers: vouchers.map((voucher) => ({
      ...voucher,
      statusLabel: VOUCHER_STATUS_LABEL[voucher.status] ?? voucher.status,
      participantOnly: true,
    })),
  });
}
