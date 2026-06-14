export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, type VoucherPrize } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consumeDailyStock,
  createVoucherFromSpin,
  eligiblePrizes,
  getCurrentBudget,
  getVoucherSettings,
  getIp,
  newPendingToken,
  newVisitorId,
  pickPrize,
  publicPrize,
  ROULETTE_PROMOTION_POLICY_KEY,
  RouletteOperationalError,
  type RouletteAvailabilityReason,
  rouletteCampaignAvailability,
  rouletteSpinIdentityWhere,
  todayRange,
  userVoucherIdentity,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";
import {
  latestLegalDocumentVersions,
  recordUserAcceptances,
  ROULETTE_PROMOTION_LEGAL_KEYS,
} from "@/lib/legal-acceptance";

const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  acceptedPolicy: z.literal(true),
});

const SESSION_TIMEOUT_MS = 700;

function requestId(req: NextRequest) {
  return req.headers.get("x-vercel-id") ?? req.headers.get("x-request-id") ?? `local-${Date.now().toString(36)}`;
}

function logSpin(level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) {
  const payload = { route: "/api/vouchers/roulette/spin", ...data };
  if (level === "error") console.error(`[voucher-roulette-spin] ${message}`, payload);
  else if (level === "warn") console.warn(`[voucher-roulette-spin] ${message}`, payload);
  else console.info(`[voucher-roulette-spin] ${message}`, payload);
}

const CAMPAIGN_ERROR_MESSAGE: Record<RouletteAvailabilityReason, string> = {
  INACTIVE: "A roleta está desativada.",
  INSUFFICIENT_ACTIVE_PRIZES: "A roleta precisa de pelo menos dois prêmios ativos.",
  BUDGET_INACTIVE: "O orçamento da roleta está desativado.",
  MONTHLY_BUDGET_EXHAUSTED: "O orçamento mensal da roleta foi esgotado.",
  DAILY_BUDGET_EXHAUSTED: "O orçamento diário da roleta foi esgotado.",
  STOCK_EXHAUSTED: "O estoque diário de prêmios foi esgotado.",
};

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

function identityLockId(s: string): bigint {
  // djb2 hash mantido em 32 bits para uso como chave do advisory lock do PostgreSQL.
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h | 0;
  }
  return BigInt(h);
}

type SpinWithPrizeAndVouchers = Prisma.VoucherSpinGetPayload<{
  include: { prize: true; vouchers: true };
}>;

function existingSpinResult(
  existing: SpinWithPrizeAndVouchers,
  prizes: VoucherPrize[],
  sessionUserId: string | null,
) {
  if (!existing.prize) return null;
  const prizeIndex = prizes.findIndex((item) => item.id === existing.prizeId);
  const voucher = existing.vouchers[0] ?? null;
  const value = existing.voucherValue ?? existing.prize.value ?? 0;
  const needsGuestClaim = Boolean(
    existing.result === "VOUCHER" &&
    value < 100 &&
    !sessionUserId &&
    !voucher?.recipientPhone &&
    !existing.recipientPhone
  );
  const needsRegistration = Boolean(
    existing.result === "VOUCHER" &&
    value === 100 &&
    !sessionUserId
  );

  return {
    spin: existing,
    prize: existing.prize,
    prizeIndex,
    voucher,
    needsGuestClaim,
    needsRegistration,
  };
}

function modalMessage(type: string, value?: number | null, needsRegistration?: boolean, prizeName?: string | null) {
  if (type === "TRY_AGAIN") {
    if (prizeName === "Quase lá!") return "Foi por pouco. Continue acompanhando a campanha.";
    if (prizeName === "Mais sorte na próxima") return "Não foi dessa vez. Mais sorte na próxima.";
    return "Não foi dessa vez. Você pode tentar novamente.";
  }
  if (type === "TRY_TOMORROW") return "Volte amanhã para tentar novamente.";
  if (value === 100 && needsRegistration) {
    return "Parabéns! Você ganhou um voucher de R$ 100. Para liberar esse benefício, conclua seu cadastro na plataforma.";
  }
  return `Parabéns! Você ganhou R$ ${Math.round(value ?? 0)} OFF. Use seu desconto após criar sua conta na plataforma.`;
}

export async function POST(req: NextRequest) {
  if (!["all", "marketing"].includes(req.cookies.get("elite_cookie_consent")?.value ?? "")) {
    return NextResponse.json(
      {
        error: "Autorize cookies de campanha para participar da roleta.",
        code: "CAMPAIGN_COOKIES_REQUIRED",
      },
      { status: 403 },
    );
  }
  const startedAt = Date.now();
  const rid = requestId(req);
  const [session, requestBody] = await Promise.all([
    hasSessionCookie(req)
      ? withTimeout(getServerSession(authOptions).catch(() => null), SESSION_TIMEOUT_MS, null)
      : Promise.resolve(null),
    req.json().catch(() => ({})),
  ]);
  const parsed = schema.safeParse(requestBody);
  if (!parsed.success) {
    logSpin("warn", "invalid_body", {
      requestId: rid,
      durationMs: Date.now() - startedAt,
      fields: parsed.error.issues.map((issue) => issue.path.join(".") || "body"),
    });
    return NextResponse.json(
      {
        error: "A solicitação do giro está incompleta ou inválida.",
        code: "INVALID_SPIN_REQUEST",
        requestId: rid,
      },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const userAgent = req.headers.get("user-agent");
  const { start, end } = todayRange();
  const sessionUserId = session?.user?.id ?? null;
  const scopedIdempotencyKey = `${sessionUserId ?? visitorId}:${body.idempotencyKey}`;

  const [settings, policyVersions, existing, user, currentBudget, prizes] = await Promise.all([
    getVoucherSettings(),
    latestLegalDocumentVersions(ROULETTE_PROMOTION_LEGAL_KEYS),
    prisma.voucherSpin.findUnique({
      where: { idempotencyKey: scopedIdempotencyKey },
      include: { prize: true, vouchers: true },
    }),
    sessionUserId
      ? prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, phone: true, email: true, document: true },
        })
      : Promise.resolve(null),
    getCurrentBudget(),
    prisma.voucherPrize.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!settings.active) {
    logSpin("warn", "inactive_campaign", { requestId: rid, durationMs: Date.now() - startedAt });
    return NextResponse.json(
      {
        error: CAMPAIGN_ERROR_MESSAGE.INACTIVE,
        code: "INACTIVE",
        requestId: rid,
      },
      { status: 403 },
    );
  }
  const policyVersion = policyVersions.get(ROULETTE_PROMOTION_POLICY_KEY);
  if (!policyVersion) {
    logSpin("warn", "legal_policy_unavailable", {
      requestId: rid,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error: "A política vigente da campanha está indisponível.",
        code: "LEGAL_POLICY_UNAVAILABLE",
        requestId: rid,
      },
      { status: 503 },
    );
  }

  if (existing) {
    const priorResult = existingSpinResult(existing, prizes, sessionUserId);
    if (priorResult) {
      return NextResponse.json({
        spinId: priorResult.spin.id,
        prize: publicPrize(priorResult.prize, Math.max(0, priorResult.prizeIndex)),
        result: priorResult.spin.result,
        message: modalMessage(
          priorResult.spin.result,
          priorResult.prize.value,
          priorResult.needsRegistration,
          priorResult.prize.name,
        ),
        needsIdentification: priorResult.needsGuestClaim,
        needsRegistration: priorResult.needsRegistration,
        pendingToken: priorResult.spin.pendingToken,
        voucher: priorResult.voucher,
      });
    }
  }

  const identity = userVoucherIdentity(user, { clientId: sessionUserId, visitorId, ipAddress, userAgent });
  const identityWhere = rouletteSpinIdentityWhere(identity);

  const limit = sessionUserId ? settings.dailySpinLimit : settings.guestDailySpinLimit;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const lockIdentity = sessionUserId ?? ipAddress ?? visitorId ?? "anon";
      const lockId = identityLockId(lockIdentity);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

      const spinChecks = await tx.voucherSpin.findMany({
        where: {
          OR: [
            { idempotencyKey: scopedIdempotencyKey },
            { ...identityWhere, createdAt: { gte: start, lt: end } },
          ],
        },
        include: { prize: true, vouchers: true },
      });
      const concurrentExisting = spinChecks.find(
        (spin) => spin.idempotencyKey === scopedIdempotencyKey,
      );
      const todaySpins = spinChecks.filter(
        (spin) => spin.createdAt >= start && spin.createdAt < end,
      );

      if (concurrentExisting) {
        const priorResult = existingSpinResult(concurrentExisting, prizes, sessionUserId);
        if (priorResult) return priorResult;
      }

      if (
        todaySpins.some((spin) => spin.result === "TRY_TOMORROW") ||
        todaySpins.length >= limit
      ) {
        const limitErr = new Error("LIMIT_REACHED") as Error & { blockedUntil: string };
        limitErr.blockedUntil = end.toISOString();
        throw limitErr;
      }

      const now = new Date();
      const eligibilityStartedAt = Date.now();
      const { prizes: candidates, stats, diagnostics } = await eligiblePrizes({
        tx,
        prizes,
        settings,
        identity,
        now,
        budget: currentBudget,
      });
      logSpin("info", "eligibility_evaluated", {
        requestId: rid,
        durationMs: Date.now() - startedAt,
        eligibilityDurationMs: Date.now() - eligibilityStartedAt,
        activePrizeCount: diagnostics.activePrizeCount,
        eligiblePrizeCount: diagnostics.eligiblePrizeCount,
        eligibleVoucherCount: diagnostics.eligibleVoucherCount,
        recentVoucherWin: diagnostics.recentVoucherWin,
        activeVoucher: diagnostics.activeVoucher,
        hasVoucher100ThisMonth: diagnostics.hasVoucher100ThisMonth,
        monthlyUsed: stats.monthlyUsed,
        monthlyRemaining: stats.monthlyRemaining,
        dailyUsed: stats.dailyUsed,
        dailyRemaining: stats.dailyRemaining,
        stockRemainingBudget: stats.dailyStockRemainingBudget,
      });
      const availability = rouletteCampaignAvailability({
        settingsActive: settings.active,
        activePrizeCount: prizes.length,
        budgetActive: stats.budget.active,
        monthlyRemaining: stats.monthlyRemaining,
        dailyRemaining: stats.dailyRemaining,
        stockRemainingBudget: stats.dailyStockRemainingBudget,
      });
      if (!availability.active) {
        throw new Error(`CAMPAIGN_UNAVAILABLE:${availability.reason}`);
      }
      const prize = pickPrize(candidates);
      if (!prize) {
        throw new RouletteOperationalError(
          "NO_ELIGIBLE_PRIZE",
          "Nenhum prêmio elegível foi encontrado para este giro.",
        );
      }

      const prizeIndex = prizes.findIndex((item) => item.id === prize.id);
      const normalizedResult = prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type;
      const isVoucher = normalizedResult === "VOUCHER" && Boolean(prize.value && prize.value > 0);
      const value = prize.value ?? null;
      const isVoucher100Guest = isVoucher && value === 100 && !sessionUserId;
      const needsGuestClaim = isVoucher && !sessionUserId && value !== 100;
      const pendingToken = needsGuestClaim || isVoucher100Guest ? newPendingToken() : null;
      const pendingExpiresAt = needsGuestClaim
        ? new Date(now.getTime() + settings.pendingClaimMinutes * 60 * 1000)
        : isVoucher100Guest
          ? new Date(now.getTime() + settings.registrationClaimHours * 60 * 60 * 1000)
          : null;

      if (isVoucher) {
        await consumeDailyStock({ tx, prize, stats });
      }

      const createdSpin = await tx.voucherSpin.create({
        data: {
          clientId: sessionUserId,
          visitorId,
          prizeId: prize.id,
          result: normalizedResult,
          voucherValue: value,
          ipAddress,
          userAgent,
          whatsapp: identity.whatsapp,
          idempotencyKey: scopedIdempotencyKey,
          pendingToken,
          pendingExpiresAt,
          legalPolicyKey: policyVersion.document.key,
          legalPolicyVersion: policyVersion.version,
          legalPolicyHash: policyVersion.contentHash,
          legalPolicyAcceptedAt: new Date(),
        },
      });

      if (sessionUserId) {
        await recordUserAcceptances({
          tx,
          userId: sessionUserId,
          documentKeys: ROULETTE_PROMOTION_LEGAL_KEYS,
          userCategory: "CLIENT",
          source: "VOUCHER_ROULETTE",
          req,
          route: "/api/vouchers/roulette/spin",
          acceptanceType: "PROMOTION",
          required: true,
          throwOnError: true,
        });
      }

      let voucher = null;
      let spin = createdSpin;
      if (isVoucher && sessionUserId) {
        voucher = await createVoucherFromSpin({
          tx,
          spin,
          prize,
          settings,
          clientId: sessionUserId,
          visitorId,
          now,
        });
        spin = await tx.voucherSpin.update({
          where: { id: spin.id },
          data: { claimedAt: now },
        });
      }

      return {
        spin,
        prize,
        prizeIndex,
        voucher,
        needsGuestClaim,
        needsRegistration: isVoucher100Guest,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LIMIT_REACHED") {
      const blockedUntil = (err as Error & { blockedUntil?: string }).blockedUntil ?? end.toISOString();
      logSpin("info", "already_participated", {
        requestId: rid,
        durationMs: Date.now() - startedAt,
        hasSession: Boolean(sessionUserId),
        hasVisitorId: Boolean(visitorId),
        limit,
        blockedUntil,
      });
      return NextResponse.json(
        {
          error: "Você já atingiu o limite diário de participações.",
          code: "DAILY_LIMIT_REACHED",
          blockedUntil,
          requestId: rid,
        },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message.startsWith("CAMPAIGN_UNAVAILABLE:")) {
      const unavailableReason = (err.message.split(":")[1] ?? "INACTIVE") as RouletteAvailabilityReason;
      logSpin("warn", "campaign_unavailable", {
        requestId: rid,
        durationMs: Date.now() - startedAt,
        unavailableReason,
      });
      return NextResponse.json(
        {
          error: CAMPAIGN_ERROR_MESSAGE[unavailableReason] ?? "A campanha não está operacional.",
          code: unavailableReason,
          unavailableReason,
          requestId: rid,
        },
        { status: 403 },
      );
    }
    if (err instanceof RouletteOperationalError) {
      logSpin("warn", "operational_validation_failed", {
        requestId: rid,
        durationMs: Date.now() - startedAt,
        code: err.code,
        error: err.message,
      });
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          requestId: rid,
        },
        { status: err.code === "PRIZE_STOCK_EXHAUSTED" ? 409 : 503 },
      );
    }
    const safeError = err instanceof Error ? err.message : "Erro desconhecido";
    const prismaCode = typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : null;
    const errorCode = prismaCode === "P2028"
      ? "SPIN_TRANSACTION_TIMEOUT"
      : "SPIN_TRANSACTION_FAILED";
    logSpin("error", "transaction_failed", {
      requestId: rid,
      durationMs: Date.now() - startedAt,
      code: errorCode,
      prismaCode,
      error: safeError.slice(0, 240),
      hasSession: Boolean(sessionUserId),
      hasVisitorId: Boolean(visitorId),
      hasIp: Boolean(ipAddress),
      userAgent: userAgent?.slice(0, 160) ?? null,
    });
    return NextResponse.json(
      {
        error: errorCode === "SPIN_TRANSACTION_TIMEOUT"
          ? "O processamento do giro excedeu o tempo limite da transação."
          : `Falha interna ao processar o giro. Código de suporte: ${rid}.`,
        code: errorCode,
        requestId: rid,
      },
      { status: 503 },
    );
  }

  const response = NextResponse.json({
    spinId: result.spin.id,
    prize: publicPrize(result.prize, Math.max(0, result.prizeIndex)),
    result: result.spin.result,
    message: modalMessage(result.spin.result, result.prize.value, result.needsRegistration, result.prize.name),
    needsIdentification: result.needsGuestClaim,
    needsRegistration: result.needsRegistration,
    pendingToken: result.spin.pendingToken,
    pendingExpiresAt: result.spin.pendingExpiresAt,
    voucher: result.voucher,
  });
  logSpin("info", "spin_completed", {
    requestId: rid,
    durationMs: Date.now() - startedAt,
    spinId: result.spin.id,
    result: result.spin.result,
    voucherValue: result.spin.voucherValue,
    hasSession: Boolean(sessionUserId),
    hasVisitorId: Boolean(visitorId),
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
