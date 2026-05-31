export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseRegistrationVouchersForUser, updateExpiredVouchers, VOUCHER_VISITOR_COOKIE } from "@/lib/voucher-roulette";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  await updateExpiredVouchers();
  await releaseRegistrationVouchersForUser({
    userId: session.user.id,
    visitorId: req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? null,
  });

  const { searchParams } = new URL(req.url);
  const professionalSlug = searchParams.get("professionalSlug");
  const professional = professionalSlug
    ? await prisma.professional.findUnique({
        where: { slug: professionalSlug },
        select: { id: true, displayName: true, voucherSettings: { select: { acceptsVouchers: true } } },
      })
    : null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });
  const phone = user?.phone ? user.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") : null;

  const acceptsVouchers = Boolean(professional?.voucherSettings?.acceptsVouchers);
  const vouchers = acceptsVouchers
    ? await prisma.clientVoucher.findMany({
        where: {
          AND: [
            {
              OR: [
                { clientId: session.user.id },
                ...(phone ? [{ recipientPhone: phone }, { whatsapp: phone }] : []),
              ],
            },
            { requiresPayment: false },
          ],
          status: "AVAILABLE",
          expiresAt: { gt: new Date() },
          appointmentId: null,
        },
        orderBy: [{ value: "desc" }, { expiresAt: "asc" }],
      })
    : [];

  return NextResponse.json({
    professional: professional ? { id: professional.id, displayName: professional.displayName, acceptsVouchers } : null,
    acceptsVouchers,
    vouchers,
  });
}
