export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  activePrizes,
  getVoucherSettings,
  getIp,
  newVisitorId,
  publicPrize,
  todayRange,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const settings = await getVoucherSettings();

  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const { start, end } = todayRange();
  const sessionUserId = session?.user?.id ?? null;

  const identityWhere = sessionUserId
    ? { clientId: sessionUserId }
    : { OR: [{ visitorId }, ...(ipAddress ? [{ ipAddress }] : [])] };

  const limit = sessionUserId ? settings.dailySpinLimit : settings.guestDailySpinLimit;
  const [firstSpinToday, prizes] = await Promise.all([
    prisma.voucherSpin.findFirst({
      where: { ...identityWhere, createdAt: { gte: start, lt: end } },
      select: { id: true, result: true },
      orderBy: { createdAt: "desc" },
    }),
    activePrizes(),
  ]);

  let spinsToday = firstSpinToday ? 1 : 0;
  let tryTomorrowSpin = firstSpinToday?.result === "TRY_TOMORROW" ? firstSpinToday : null;
  if (firstSpinToday && limit > 1 && !tryTomorrowSpin) {
    const [countToday, tomorrowSpin] = await Promise.all([
      prisma.voucherSpin.count({ where: { ...identityWhere, createdAt: { gte: start, lt: end } } }),
      prisma.voucherSpin.findFirst({
        where: { ...identityWhere, result: "TRY_TOMORROW", createdAt: { gte: start, lt: end } },
        select: { id: true, result: true },
      }),
    ]);
    spinsToday = countToday;
    tryTomorrowSpin = tomorrowSpin;
  }

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
