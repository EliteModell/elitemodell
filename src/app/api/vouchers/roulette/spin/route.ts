export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consumeDailyStock,
  createVoucherFromSpin,
  eligiblePrizes,
  getVoucherSettings,
  getIp,
  newPendingToken,
  newVisitorId,
  pickPrize,
  publicPrize,
  todayRange,
  userVoucherIdentity,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";

const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
});

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
  const session = await getServerSession(authOptions).catch(() => null);
  const body = schema.parse(await req.json().catch(() => ({})));
  const settings = await getVoucherSettings();
  if (!settings.active) return NextResponse.json({ error: "A roleta está temporariamente indisponível." }, { status: 403 });

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
    const needsIdentification = Boolean(voucher && existing.result === "VOUCHER" && value < 100 && !voucher.recipientPhone && !sessionUserId);
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

  const identityWhere = sessionUserId
    ? { clientId: sessionUserId }
    : { OR: [{ visitorId }, ...(ipAddress ? [{ ipAddress }] : [])] };

  const limit = sessionUserId ? settings.dailySpinLimit : settings.guestDailySpinLimit;
  const firstSpinToday = await prisma.voucherSpin.findFirst({
    where: { ...identityWhere, createdAt: { gte: start, lt: end } },
    select: { id: true, result: true },
    orderBy: { createdAt: "desc" },
  });
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

  if (tryTomorrowSpin || spinsToday >= limit) {
    const prizes = await prisma.voucherPrize.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const prize = prizes.find((item) => item.type === "TRY_TOMORROW") ??
      prizes.find((item) => item.type === "TRY_AGAIN");

    if (!prize) {
      return NextResponse.json({ error: "Você já girou hoje. Volte amanhã para tentar novamente.", blockedUntil: end.toISOString() }, { status: 429 });
    }

    return NextResponse.json({
      spinId: tryTomorrowSpin?.id ?? `blocked-${visitorId}`,
      prize: publicPrize(prize, Math.max(0, prizes.findIndex((item) => item.id === prize.id))),
      result: prize.type === "TRY_TOMORROW" ? "TRY_TOMORROW" : "TRY_AGAIN",
      message: "Você já girou hoje. Volte amanhã para tentar novamente.",
      needsIdentification: false,
      needsRegistration: false,
      pendingToken: null,
      blockedUntil: end.toISOString(),
      voucher: null,
    });
  }

  let result;
  try {
    const user = sessionUserId
      ? await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true, phone: true, email: true, document: true } })
      : null;
    const identity = userVoucherIdentity(user, { visitorId, ipAddress, userAgent });

    result = await prisma.$transaction(async (tx) => {
      const prizes = await tx.voucherPrize.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const { prizes: candidates, stats } = await eligiblePrizes({ tx, prizes, settings, identity });
      const prize = pickPrize(candidates);
      if (!prize) throw new Error("Nenhum prêmio ativo configurado.");

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

      if (isVoucher) {
        await consumeDailyStock({ tx, prize, stats });
      }

      const spin = await tx.voucherSpin.create({
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

      let voucher = null;
      if (isVoucher) {
        voucher = await createVoucherFromSpin({ tx, spin, prize, settings, clientId: sessionUserId, visitorId });
        if (sessionUserId) {
          await tx.voucherSpin.update({ where: { id: spin.id }, data: { claimedAt: new Date() } });
        }
      }

      return { spin, prize, prizeIndex, voucher, needsGuestClaim, needsRegistration: isVoucher100Guest };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 20_000 });
  } catch (err) {
    const safeError = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[voucher-roulette-spin] fallback sem prêmio", { error: safeError.slice(0, 240) });

    const prizes = await prisma.voucherPrize.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const prize = prizes.find((item) => item.type === "TRY_AGAIN" && item.name.toLowerCase().includes("sorte")) ??
      prizes.find((item) => item.type === "TRY_AGAIN") ??
      prizes.find((item) => item.type === "TRY_TOMORROW");

    if (!prize) {
      return NextResponse.json({ error: "Não foi possível girar agora. Tente novamente." }, { status: 500 });
    }

    const spin = await prisma.voucherSpin.create({
      data: {
        clientId: sessionUserId,
        visitorId,
        prizeId: prize.id,
        result: prize.type === "TRY_TOMORROW" ? "TRY_TOMORROW" : "TRY_AGAIN",
        voucherValue: null,
        ipAddress,
        userAgent,
        idempotencyKey: scopedIdempotencyKey,
      },
    });

    result = {
      spin,
      prize,
      prizeIndex: prizes.findIndex((item) => item.id === prize.id),
      voucher: null,
      needsGuestClaim: false,
      needsRegistration: false,
    };
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
  response.cookies.set(VOUCHER_VISITOR_COOKIE, visitorId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}
