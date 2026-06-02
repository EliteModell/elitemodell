export const dynamic = "force-dynamic";
export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { VoucherPrize } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVoucherFromSpin,
  getVoucherSettings,
  getIp,
  newPendingToken,
  newVisitorId,
  publicPrize,
  rouletteSpinIdentityWhere,
  todayRange,
  userVoucherIdentity,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";

const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
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
  // djb2 hash mantido em 32 bits — usado como chave para pg_advisory_xact_lock
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h | 0;
  }
  return BigInt(h);
}

function pickFastPrize(prizes: VoucherPrize[]) {
  const active = prizes.filter((item) => item.active && (item.currentProbability || item.probability) > 0);
  const total = active.reduce((sum, item) => sum + (item.currentProbability || item.probability), 0);
  if (total <= 0) return active[0] ?? null;
  let cursor = 0;
  const roll = Math.random() * total;
  for (const prize of active) {
    cursor += prize.currentProbability || prize.probability;
    if (roll <= cursor) return prize;
  }
  return active[active.length - 1] ?? null;
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
  const startedAt = Date.now();
  const rid = requestId(req);
  const session = hasSessionCookie(req)
    ? await withTimeout(getServerSession(authOptions).catch(() => null), SESSION_TIMEOUT_MS, null)
    : null;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    logSpin("warn", "invalid_body", { requestId: rid, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Não foi possível preparar seu giro. Atualize a página e tente novamente." }, { status: 400 });
  }
  const body = parsed.data;
  const settings = await getVoucherSettings();
  if (!settings.active) {
    logSpin("warn", "inactive_campaign", { requestId: rid, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "A roleta está temporariamente indisponível." }, { status: 403 });
  }

  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const userAgent = req.headers.get("user-agent");
  const { start, end } = todayRange();
  const sessionUserId = session?.user?.id ?? null;
  const scopedIdempotencyKey = `${sessionUserId ?? visitorId}:${body.idempotencyKey}`;

  const existing = await prisma.voucherSpin.findUnique({
    where: { idempotencyKey: scopedIdempotencyKey },
    include: { prize: true, vouchers: true },
  });
  if (existing?.prize) {
    const prizes = await prisma.voucherPrize.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const prizeIndex = prizes.findIndex((item) => item.id === existing.prizeId);
    const voucher = existing.vouchers[0] ?? null;
    const value = existing.voucherValue ?? existing.prize.value ?? 0;
    const needsIdentification = Boolean(existing.result === "VOUCHER" && value < 100 && !sessionUserId && !voucher?.recipientPhone && !existing.recipientPhone);
    const needsRegistration = Boolean(voucher?.status === "AWAITING_REGISTRATION" && !needsIdentification);
    return NextResponse.json({
      spinId: existing.id,
      prize: publicPrize(existing.prize, Math.max(0, prizeIndex)),
      result: existing.result,
      message: modalMessage(existing.result, existing.prize.value, needsRegistration, existing.prize.name),
      needsIdentification,
      needsRegistration,
      pendingToken: existing.pendingToken,
      voucher,
    });
  }

  const user = sessionUserId
    ? await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true, phone: true, email: true, document: true } })
    : null;
  const identity = userVoucherIdentity(user, { clientId: sessionUserId, visitorId, ipAddress, userAgent });
  const identityWhere = rouletteSpinIdentityWhere(identity);

  const limit = sessionUserId ? settings.dailySpinLimit : settings.guestDailySpinLimit;

  // Busca prêmios fora da transação (leitura, sem impacto em concorrência)
  const prizes = await prisma.voucherPrize.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const prize = pickFastPrize(prizes);
  if (!prize) {
    logSpin("error", "no_active_prize", { requestId: rid, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Não foi possível girar agora. Tente novamente.", requestId: rid }, { status: 503 });
  }

  const prizeIndex = prizes.findIndex((item) => item.id === prize.id);
  const normalizedResult = prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type;
  const isVoucher = normalizedResult === "VOUCHER" && Boolean(prize.value && prize.value > 0);
  const value = prize.value ?? null;
  const isVoucher100Guest = isVoucher && value === 100 && !sessionUserId;
  const needsGuestClaim = isVoucher && !sessionUserId && value !== 100;
  const pendingToken = needsGuestClaim || isVoucher100Guest ? newPendingToken() : null;
  const pendingExpiresAt = needsGuestClaim
    ? new Date(Date.now() + settings.pendingClaimMinutes * 60 * 1000)
    : isVoucher100Guest
      ? new Date(Date.now() + settings.registrationClaimHours * 60 * 60 * 1000)
      : null;

  let result;
  try {
    // Transação com advisory lock: garante que a verificação de limite e a criação do spin
    // sejam atômicas — dois requests simultâneos do mesmo usuário não passam ambos.
    const spin = await prisma.$transaction(async (tx) => {
      const lockId = identityLockId(sessionUserId ?? visitorId ?? ipAddress ?? "anon");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

      const [spinsCountToday, tomorrowSpin] = await Promise.all([
        tx.voucherSpin.count({ where: { ...identityWhere, createdAt: { gte: start, lt: end } } }),
        tx.voucherSpin.findFirst({
          where: { ...identityWhere, result: "TRY_TOMORROW", createdAt: { gte: start, lt: end } },
          select: { id: true },
        }),
      ]);

      if (tomorrowSpin || spinsCountToday >= limit) {
        const limitErr = new Error("LIMIT_REACHED") as Error & { blockedUntil: string };
        limitErr.blockedUntil = end.toISOString();
        throw limitErr;
      }

      return tx.voucherSpin.create({
        data: {
          clientId: sessionUserId,
          visitorId,
          prizeId: prize.id,
          result: normalizedResult,
          voucherValue: value,
          ipAddress,
          userAgent,
          idempotencyKey: scopedIdempotencyKey,
          pendingToken,
          pendingExpiresAt,
        },
      });
    }, { timeout: 10_000 });

    let voucher = null;
    if (isVoucher && sessionUserId) {
      voucher = await createVoucherFromSpin({ spin, prize, settings, clientId: sessionUserId, visitorId });
      await prisma.voucherSpin.update({ where: { id: spin.id }, data: { claimedAt: new Date() } });
    }

    result = { spin, prize, prizeIndex, voucher, needsGuestClaim, needsRegistration: isVoucher100Guest };
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
      return NextResponse.json({ error: "Você já participou desta campanha", blockedUntil }, { status: 409 });
    }
    const safeError = err instanceof Error ? err.message : "Erro desconhecido";
    logSpin("error", "transaction_failed", {
      requestId: rid,
      durationMs: Date.now() - startedAt,
      error: safeError.slice(0, 240),
      hasSession: Boolean(sessionUserId),
      hasVisitorId: Boolean(visitorId),
      hasIp: Boolean(ipAddress),
      userAgent: userAgent?.slice(0, 160) ?? null,
    });
    return NextResponse.json({ error: "Não foi possível girar agora. Tente novamente.", requestId: rid }, { status: 503 });
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
