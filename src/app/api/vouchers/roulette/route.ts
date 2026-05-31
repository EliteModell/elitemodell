export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  activePrizes,
  ensureVoucherDefaults,
  getIp,
  newVisitorId,
  publicPrize,
  todayRange,
  updateExpiredVouchers,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const settings = await ensureVoucherDefaults();
  await updateExpiredVouchers();

  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const { start, end } = todayRange();

  const identityWhere = session?.user?.id
    ? { clientId: session.user.id }
    : { OR: [{ visitorId }, ...(ipAddress ? [{ ipAddress }] : [])] };

  const [spinsToday, tryTomorrowSpin, prizes] = await Promise.all([
    prisma.voucherSpin.count({ where: { ...identityWhere, createdAt: { gte: start, lt: end } } }),
    prisma.voucherSpin.findFirst({
      where: { ...identityWhere, result: "TRY_TOMORROW", createdAt: { gte: start, lt: end } },
      select: { id: true },
    }),
    activePrizes(),
  ]);

  const limit = session?.user?.id ? settings.dailySpinLimit : settings.guestDailySpinLimit;
  const canSpin = settings.active && !tryTomorrowSpin && spinsToday < limit;
  const response = NextResponse.json({
    active: settings.active,
    canSpin,
    spinsToday,
    dailyLimit: limit,
    blockedUntil: tryTomorrowSpin || spinsToday >= limit ? end.toISOString() : null,
    visitorId,
    prizes: prizes.map(publicPrize),
  });
  response.cookies.set(VOUCHER_VISITOR_COOKIE, visitorId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}
