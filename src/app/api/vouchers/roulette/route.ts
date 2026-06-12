export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  activePrizes,
  getVoucherSettings,
  getIp,
  hasPromotionAuthorization,
  newVisitorId,
  publicPrize,
  ROULETTE_PROMOTION_POLICY_KEY,
  rouletteSpinIdentityWhere,
  todayRange,
  userVoucherIdentity,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";
import { prisma } from "@/lib/prisma";
import {
  latestLegalDocumentVersions,
  ROULETTE_PROMOTION_LEGAL_KEYS,
} from "@/lib/legal-acceptance";
import { legalDocumentRoute } from "@/lib/legal-document-catalog";

const SESSION_TIMEOUT_MS = 700;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function hasSessionCookie(req: NextRequest) {
  return Boolean(
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value
  );
}

export async function GET(req: NextRequest) {
  if (!["all", "marketing"].includes(req.cookies.get("elite_cookie_consent")?.value ?? "")) {
    return NextResponse.json({ active: false, canSpin: false, consentRequired: true, prizes: [] });
  }
  const session = hasSessionCookie(req)
    ? await withTimeout(getServerSession(authOptions).catch(() => null), SESSION_TIMEOUT_MS, null)
    : null;
  const settings = await getVoucherSettings();
  const policyVersions = settings.active && hasPromotionAuthorization(settings)
    ? await latestLegalDocumentVersions(ROULETTE_PROMOTION_LEGAL_KEYS)
    : new Map();
  const policyVersion = policyVersions.get(ROULETTE_PROMOTION_POLICY_KEY);

  if (!settings.active || !hasPromotionAuthorization(settings) || !policyVersion) {
    return NextResponse.json({
      active: false,
      canSpin: false,
      legalPolicyUnavailable: settings.active && !policyVersion,
      authorizationUnavailable: settings.active && !hasPromotionAuthorization(settings),
      prizes: [],
    });
  }

  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const { start, end } = todayRange();
  const sessionUserId = session?.user?.id ?? null;
  const user = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, phone: true, email: true, document: true },
      })
    : null;
  const identity = userVoucherIdentity(user, {
    clientId: sessionUserId,
    visitorId,
    ipAddress,
    userAgent: req.headers.get("user-agent"),
  });

  const identityWhere = rouletteSpinIdentityWhere(identity);

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
    active: true,
    canSpin,
    spinsToday,
    dailyLimit: limit,
    blockedUntil: tryTomorrowSpin || spinsToday >= limit ? end.toISOString() : null,
    visitorId,
    prizes: prizes.map(publicPrize),
    policy: {
      key: policyVersion.document.key,
      title: policyVersion.document.name,
      href: legalDocumentRoute(policyVersion.document.key),
      version: policyVersion.version,
      hash: policyVersion.contentHash,
      authorizationReference: settings.promotionAuthorizationReference,
    },
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
