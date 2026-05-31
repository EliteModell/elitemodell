export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVoucherFromSpin,
  eligiblePrizes,
  ensureVoucherDefaults,
  getIp,
  newPendingToken,
  newVisitorId,
  pickPrize,
  publicPrize,
  todayRange,
  updateExpiredVouchers,
  userVoucherIdentity,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";

const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
});

function modalMessage(type: string, value?: number | null, needsRegistration?: boolean) {
  if (type === "TRY_AGAIN") return "Não foi dessa vez. Você pode tentar novamente.";
  if (type === "TRY_TOMORROW") return "Volte amanhã para tentar novamente.";
  if (value === 100 && needsRegistration) {
    return "Parabéns! Você ganhou um voucher de R$ 100. Para liberar esse benefício, conclua seu cadastro na plataforma.";
  }
  return `Parabéns! Você ganhou um voucher de R$ ${Math.round(value ?? 0)} para usar com profissionais participantes.`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const body = schema.parse(await req.json().catch(() => ({})));
  const settings = await ensureVoucherDefaults();
  if (!settings.active) return NextResponse.json({ error: "A roleta está temporariamente indisponível." }, { status: 403 });

  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? newVisitorId();
  const ipAddress = getIp(req.headers);
  const userAgent = req.headers.get("user-agent");
  const { start, end } = todayRange();
  const scopedIdempotencyKey = `${session?.user?.id ?? visitorId}:${body.idempotencyKey}`;
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, phone: true, email: true, document: true } })
    : null;
  const identity = userVoucherIdentity(user, { visitorId, ipAddress, userAgent });

  const existing = await prisma.voucherSpin.findUnique({
    where: { idempotencyKey: scopedIdempotencyKey },
    include: { prize: true, vouchers: true },
  });
  if (existing?.prize) {
    const prizes = await prisma.voucherPrize.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const prizeIndex = prizes.findIndex((item) => item.id === existing.prizeId);
    const voucher = existing.vouchers[0] ?? null;
    const needsRegistration = voucher?.status === "AWAITING_REGISTRATION";
    const needsIdentification = !voucher && existing.result === "VOUCHER" && (existing.voucherValue ?? existing.prize.value ?? 0) < 100;
    return NextResponse.json({
      spinId: existing.id,
      prize: publicPrize(existing.prize, Math.max(0, prizeIndex)),
      result: existing.result,
      message: modalMessage(existing.result, existing.prize.value, needsRegistration),
      needsIdentification,
      needsRegistration,
      pendingToken: existing.pendingToken,
      voucher,
    });
  }

  const identityWhere = session?.user?.id
    ? { clientId: session.user.id }
    : { OR: [{ visitorId }, ...(ipAddress ? [{ ipAddress }] : []), ...(userAgent ? [{ userAgent }] : [])] };

  const [spinsToday, tryTomorrowSpin] = await Promise.all([
    prisma.voucherSpin.count({ where: { ...identityWhere, createdAt: { gte: start, lt: end } } }),
    prisma.voucherSpin.findFirst({ where: { ...identityWhere, result: "TRY_TOMORROW", createdAt: { gte: start, lt: end } } }),
  ]);

  const limit = session?.user?.id ? settings.dailySpinLimit : settings.guestDailySpinLimit;
  if (tryTomorrowSpin || spinsToday >= limit) {
    return NextResponse.json(
      { error: "Você já girou hoje. Volte amanhã para tentar novamente.", blockedUntil: end.toISOString() },
      { status: 429 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await updateExpiredVouchers(new Date(), tx);

    const prizes = await tx.voucherPrize.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const { prizes: candidates } = await eligiblePrizes({ tx, prizes, settings, identity });
    const prize = pickPrize(candidates);
    if (!prize) throw new Error("Nenhum prêmio ativo configurado.");

    const prizeIndex = prizes.findIndex((item) => item.id === prize.id);
    const normalizedResult = prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type;
    const isVoucher = normalizedResult === "VOUCHER" && Boolean(prize.value && prize.value > 0);
    const value = prize.value ?? null;
    const isVoucher100Guest = isVoucher && value === 100 && !session?.user?.id;
    const needsGuestClaim = isVoucher && !session?.user?.id && value !== 100;
    const pendingToken = needsGuestClaim || isVoucher100Guest ? newPendingToken() : null;
    const pendingExpiresAt = needsGuestClaim
      ? new Date(Date.now() + settings.pendingClaimMinutes * 60 * 1000)
      : isVoucher100Guest
        ? new Date(Date.now() + settings.registrationClaimHours * 60 * 60 * 1000)
        : null;

    const spin = await tx.voucherSpin.create({
      data: {
        clientId: session?.user?.id ?? null,
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

    let voucher = null;
    if (session?.user?.id && isVoucher) {
      voucher = await createVoucherFromSpin({ tx, spin, prize, settings, clientId: session.user.id, visitorId });
      await tx.voucherSpin.update({ where: { id: spin.id }, data: { claimedAt: new Date() } });
    } else if (isVoucher100Guest) {
      voucher = await createVoucherFromSpin({ tx, spin, prize, settings, visitorId });
    }

    return { spin, prize, prizeIndex, voucher, needsGuestClaim, needsRegistration: isVoucher100Guest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const response = NextResponse.json({
    spinId: result.spin.id,
    prize: publicPrize(result.prize, Math.max(0, result.prizeIndex)),
    result: result.spin.result,
    message: modalMessage(result.spin.result, result.prize.value, result.needsRegistration),
    needsIdentification: result.needsGuestClaim,
    needsRegistration: result.needsRegistration,
    pendingToken: result.spin.pendingToken,
    pendingExpiresAt: result.spin.pendingExpiresAt,
    voucher: result.voucher,
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
