import crypto from "crypto";
import type { Prisma, User, VoucherBudget, VoucherPrize, VoucherSettings, VoucherSpin } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VOUCHER_VISITOR_COOKIE = "elite_voucher_visitor";
export const VOUCHER_MODAL_SESSION_KEY = "elite_voucher_modal_closed";
export const VOUCHER_MONTHLY_LIMIT = 3000;
export const VOUCHER_DAILY_LIMIT = 100;

export const VOUCHER_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Disponível",
  USED: "Usado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  AWAITING_REGISTRATION: "Aguardando cadastro",
  AWAITING_PAYMENT: "Aguardando pagamento",
};

export type VoucherPrizeType = "VOUCHER" | "TRY_AGAIN" | "TRY_TOMORROW";
export type VoucherIdentity = {
  clientId?: string | null;
  visitorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document?: string | null;
};

const BUDGET_STATUSES = ["AVAILABLE", "USED", "EXPIRED", "AWAITING_REGISTRATION"];
const ACTIVE_VOUCHER_STATUSES = ["AVAILABLE", "AWAITING_REGISTRATION"];
const VOUCHER_100_PRIZE_ID = "voucher-100-paid";

const DEFAULT_PRIZES = [
  { id: "voucher-5", name: "Voucher R$ 5", type: "VOUCHER", value: 5, probability: 18, monthlyQuantityLimit: 180, dailyQuantityLimit: 6, weeklyQuantityLimit: null, expiresInDays: 3, expiresInHours: 72, sortOrder: 0 },
  { id: "voucher-10", name: "Voucher R$ 10", type: "VOUCHER", value: 10, probability: 8, monthlyQuantityLimit: 90, dailyQuantityLimit: 3, weeklyQuantityLimit: null, expiresInDays: 3, expiresInHours: 72, sortOrder: 1 },
  { id: "voucher-20", name: "Voucher R$ 20", type: "VOUCHER", value: 20, probability: 3, monthlyQuantityLimit: 30, dailyQuantityLimit: 1, weeklyQuantityLimit: null, expiresInDays: 2, expiresInHours: 48, sortOrder: 2 },
  { id: "voucher-50", name: "Voucher R$ 50", type: "VOUCHER", value: 50, probability: 0.8, monthlyQuantityLimit: 8, dailyQuantityLimit: null, weeklyQuantityLimit: 2, expiresInDays: 1, expiresInHours: 24, sortOrder: 3 },
  { id: VOUCHER_100_PRIZE_ID, name: "Voucher R$ 100", type: "VOUCHER", value: 100, probability: 0.2, monthlyQuantityLimit: 2, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 1, expiresInHours: 24, sortOrder: 4 },
  { id: "try-again", name: "Tente outra vez", type: "TRY_AGAIN", value: null, probability: 45, monthlyQuantityLimit: null, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 0, expiresInHours: null, sortOrder: 5 },
  { id: "try-tomorrow", name: "Tente amanhã", type: "TRY_TOMORROW", value: null, probability: 25, monthlyQuantityLimit: null, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 0, expiresInHours: null, sortOrder: 6 },
] as const;

export type BudgetStats = {
  budget: VoucherBudget;
  month: number;
  year: number;
  monthStart: Date;
  monthEnd: Date;
  todayStart: Date;
  tomorrowStart: Date;
  weekStart: Date;
  weekEnd: Date;
  dayOfMonth: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  dailyUsed: number;
  dailyAllowance: number;
  dailyRemaining: number;
  vouchersIssued: number;
  vouchersUsed: number;
  vouchersExpired: number;
  vouchersAwaitingRegistration: number;
  usageRate: number;
};

export type PrizeWithChance = VoucherPrize & {
  effectiveProbability: number;
  monthUsed: number;
  dayUsed: number;
  weekUsed: number;
};

export function normalizeVoucherPhone(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits.slice(2);
  return digits.slice(0, 11);
}

export function newVisitorId() {
  return crypto.randomBytes(18).toString("base64url");
}

export function newPendingToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function getIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  );
}

export function todayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, month: now.getMonth() + 1, year: now.getFullYear(), dayOfMonth: now.getDate() };
}

export function weekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function db<T extends Prisma.TransactionClient | typeof prisma>(tx?: T) {
  return tx ?? prisma;
}

export async function updateExpiredVouchers(now = new Date(), tx?: Prisma.TransactionClient) {
  await db(tx).clientVoucher.updateMany({
    where: {
      status: { in: ["AVAILABLE", "AWAITING_REGISTRATION", "AWAITING_PAYMENT"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
}

export async function ensureVoucherDefaults(now = new Date()) {
  const settings = await prisma.voucherSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      active: true,
      dailySpinLimit: 1,
      guestDailySpinLimit: 1,
      pendingClaimMinutes: 30,
      defaultExpiresInDays: 15,
      monthlyBudgetLimit: VOUCHER_MONTHLY_LIMIT,
      dailyBudgetLimit: VOUCHER_DAILY_LIMIT,
      dailyBudgetMode: "BLOCK_FREE_VOUCHERS",
      voucherWinCooldownDays: 7,
      blockMultipleActiveVouchers: true,
      registrationClaimHours: 24,
    },
    update: {},
  });

  await prisma.voucherPrize.createMany({
    data: DEFAULT_PRIZES.map((prize) => ({
      id: prize.id,
      name: prize.name,
      type: prize.type,
      value: prize.value,
      probability: prize.probability,
      baseProbability: prize.probability,
      currentProbability: prize.probability,
      monthlyQuantityLimit: prize.monthlyQuantityLimit,
      dailyQuantityLimit: prize.dailyQuantityLimit,
      weeklyQuantityLimit: prize.weeklyQuantityLimit,
      active: true,
      requiresPayment: false,
      paymentAmount: null,
      expiresInDays: prize.expiresInDays,
      expiresInHours: prize.expiresInHours,
      sortOrder: prize.sortOrder,
    })),
    skipDuplicates: true,
  });

  await prisma.voucherPrize.updateMany({
    where: { id: VOUCHER_100_PRIZE_ID },
    data: {
      name: "Voucher R$ 100",
      type: "VOUCHER",
      value: 100,
      requiresPayment: false,
      paymentAmount: null,
      expiresInDays: 1,
      expiresInHours: 24,
      monthlyQuantityLimit: 2,
      probability: 0.2,
      baseProbability: 0.2,
      currentProbability: 0.2,
      sortOrder: 4,
    },
  });

  const { month, year } = monthRange(now);
  await prisma.voucherBudget.upsert({
    where: { month_year: { month, year } },
    create: {
      id: `voucher-budget-${year}-${month}`,
      month,
      year,
      monthlyLimit: settings.monthlyBudgetLimit,
      dailyLimit: settings.dailyBudgetLimit,
      active: true,
    },
    update: {},
  });

  return settings;
}

export async function activePrizes(tx?: Prisma.TransactionClient) {
  await ensureVoucherDefaults();
  return db(tx).voucherPrize.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function publicPrize(prize: VoucherPrize | PrizeWithChance, index: number) {
  const effectiveProbability = "effectiveProbability" in prize ? prize.effectiveProbability : prize.currentProbability || prize.probability;
  return {
    id: prize.id,
    index,
    name: prize.name,
    type: prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type,
    value: prize.value,
    requiresPayment: false,
    paymentAmount: null,
    currentProbability: effectiveProbability,
  };
}

export function voucherExpiresAtByHours(hours: number, now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + Math.max(1, hours));
  return expiresAt;
}

export function voucherExpiresAt(prize: VoucherPrize, now = new Date()) {
  if (prize.expiresInHours && prize.expiresInHours > 0) return voucherExpiresAtByHours(prize.expiresInHours, now);
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, prize.expiresInDays));
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}

export async function generateVoucherCode(tx: Prisma.TransactionClient = prisma) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `ELITE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await tx.clientVoucher.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  return `ELITE-${Date.now().toString(36).toUpperCase()}`;
}

export async function getCurrentBudget(now = new Date(), tx?: Prisma.TransactionClient) {
  const settings = await db(tx).voucherSettings.findUnique({ where: { id: "default" } });
  const { month, year } = monthRange(now);
  return db(tx).voucherBudget.upsert({
    where: { month_year: { month, year } },
    create: {
      id: `voucher-budget-${year}-${month}`,
      month,
      year,
      monthlyLimit: settings?.monthlyBudgetLimit ?? VOUCHER_MONTHLY_LIMIT,
      dailyLimit: settings?.dailyBudgetLimit ?? VOUCHER_DAILY_LIMIT,
      active: true,
    },
    update: {},
  });
}

export async function getBudgetStats(now = new Date(), tx?: Prisma.TransactionClient): Promise<BudgetStats> {
  const database = db(tx);
  const budget = await getCurrentBudget(now, tx);
  const { start: monthStart, end: monthEnd, month, year, dayOfMonth } = monthRange(now);
  const { start: todayStart, end: tomorrowStart } = todayRange(now);
  const { start: weekStart, end: weekEnd } = weekRange(now);
  const budgetWhere = {
    requiresPayment: false,
    value: { gt: 0 },
    status: { in: BUDGET_STATUSES },
  };
  const [monthAgg, beforeTodayAgg, todayAgg, issued, used, expired, awaitingRegistration] = await Promise.all([
    database.clientVoucher.aggregate({
      where: { ...budgetWhere, createdAt: { gte: monthStart, lt: monthEnd } },
      _sum: { value: true },
      _count: { _all: true },
    }),
    database.clientVoucher.aggregate({
      where: { ...budgetWhere, createdAt: { gte: monthStart, lt: todayStart } },
      _sum: { value: true },
    }),
    database.clientVoucher.aggregate({
      where: { ...budgetWhere, createdAt: { gte: todayStart, lt: tomorrowStart } },
      _sum: { value: true },
    }),
    database.clientVoucher.count({ where: { ...budgetWhere, createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "USED", createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "EXPIRED", createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "AWAITING_REGISTRATION", createdAt: { gte: monthStart, lt: monthEnd } } }),
  ]);

  const monthlyUsed = monthAgg._sum.value ?? 0;
  const usedBeforeToday = beforeTodayAgg._sum.value ?? 0;
  const dailyUsed = todayAgg._sum.value ?? 0;
  const dailyAllowanceToDate = Math.min(budget.monthlyLimit, budget.dailyLimit * dayOfMonth);
  const dailyAllowance = Math.max(0, dailyAllowanceToDate - usedBeforeToday);
  const monthlyRemaining = Math.max(0, budget.monthlyLimit - monthlyUsed);
  const dailyRemaining = Math.max(0, Math.min(monthlyRemaining, dailyAllowance - dailyUsed));

  return {
    budget,
    month,
    year,
    monthStart,
    monthEnd,
    todayStart,
    tomorrowStart,
    weekStart,
    weekEnd,
    dayOfMonth,
    monthlyUsed,
    monthlyRemaining,
    dailyUsed,
    dailyAllowance,
    dailyRemaining,
    vouchersIssued: issued,
    vouchersUsed: used,
    vouchersExpired: expired,
    vouchersAwaitingRegistration: awaitingRegistration,
    usageRate: budget.monthlyLimit > 0 ? used / Math.max(1, issued) : 0,
  };
}

function identityOr(identity: VoucherIdentity, target: "spin" | "voucher" = "spin") {
  const phone = normalizeVoucherPhone(identity.whatsapp);
  const or: Prisma.VoucherSpinWhereInput[] | Prisma.ClientVoucherWhereInput[] = [];

  if (identity.clientId) or.push({ clientId: identity.clientId } as never);
  if (identity.visitorId) or.push({ visitorId: identity.visitorId } as never);
  if (identity.ipAddress && target === "spin") or.push({ ipAddress: identity.ipAddress } as never);
  if (identity.userAgent && target === "spin") or.push({ userAgent: identity.userAgent } as never);
  if (phone) {
    if (target === "spin") or.push({ OR: [{ whatsapp: phone }, { recipientPhone: phone }] } as never);
    else or.push({ OR: [{ whatsapp: phone }, { recipientPhone: phone }] } as never);
  }
  return or;
}

async function countPrizeVouchers(tx: Prisma.TransactionClient, prize: VoucherPrize, start: Date, end: Date) {
  return tx.clientVoucher.count({
    where: {
      prizeId: prize.id,
      status: { in: BUDGET_STATUSES },
      createdAt: { gte: start, lt: end },
    },
  });
}

async function hasRecentVoucherWin(tx: Prisma.TransactionClient, identity: VoucherIdentity, cooldownDays: number, now = new Date()) {
  const since = new Date(now);
  since.setDate(since.getDate() - Math.max(1, cooldownDays));
  const or = identityOr(identity, "spin") as Prisma.VoucherSpinWhereInput[];
  if (!or.length) return false;
  const spin = await tx.voucherSpin.findFirst({
    where: {
      OR: or,
      result: "VOUCHER",
      voucherValue: { gt: 0 },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(spin);
}

async function hasActiveVoucher(tx: Prisma.TransactionClient, identity: VoucherIdentity) {
  const or = identityOr(identity, "voucher") as Prisma.ClientVoucherWhereInput[];
  if (!or.length) return false;
  const voucher = await tx.clientVoucher.findFirst({
    where: {
      OR: or,
      status: { in: ACTIVE_VOUCHER_STATUSES },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(voucher);
}

async function hasVoucher100ThisMonth(tx: Prisma.TransactionClient, identity: VoucherIdentity, stats: BudgetStats) {
  const spinOr = identityOr(identity, "spin") as Prisma.VoucherSpinWhereInput[];
  const voucherOr = identityOr(identity, "voucher") as Prisma.ClientVoucherWhereInput[];
  const phone = normalizeVoucherPhone(identity.whatsapp);
  const userOr: Prisma.UserWhereInput[] = [
    ...(identity.email ? [{ email: identity.email }] : []),
    ...(identity.document ? [{ document: identity.document }] : []),
    ...(phone ? [{ phone }] : []),
  ];
  const [spin, voucher, voucherByUser] = await Promise.all([
    spinOr.length ? tx.voucherSpin.findFirst({
      where: {
        OR: spinOr,
        result: "VOUCHER",
        voucherValue: 100,
        createdAt: { gte: stats.monthStart, lt: stats.monthEnd },
      },
      select: { id: true },
    }) : null,
    voucherOr.length ? tx.clientVoucher.findFirst({
      where: {
        OR: voucherOr,
        value: 100,
        status: { in: BUDGET_STATUSES },
        createdAt: { gte: stats.monthStart, lt: stats.monthEnd },
      },
      select: { id: true },
    }) : null,
    userOr.length ? tx.clientVoucher.findFirst({
      where: {
        value: 100,
        status: { in: BUDGET_STATUSES },
        createdAt: { gte: stats.monthStart, lt: stats.monthEnd },
        client: { is: { OR: userOr } },
      },
      select: { id: true },
    }) : null,
  ]);
  return Boolean(spin || voucher || voucherByUser);
}

function adjustedProbability(prize: VoucherPrize, stats: BudgetStats, settings: VoucherSettings) {
  const base = prize.baseProbability || prize.currentProbability || prize.probability;
  if (prize.type !== "VOUCHER" || !prize.value) return base;
  if (!stats.budget.active || stats.monthlyRemaining < prize.value) return 0;
  if (settings.dailyBudgetMode === "BLOCK_FREE_VOUCHERS" && stats.dailyRemaining < prize.value) return 0;

  const remainingRatio = stats.budget.monthlyLimit > 0 ? stats.monthlyRemaining / stats.budget.monthlyLimit : 0;
  if (remainingRatio > 0.7) return base;
  if (remainingRatio > 0.3) {
    if (prize.value >= 50) return base * 0.35;
    if (prize.value >= 20) return base * 0.55;
    if (prize.value === 5) return base * 1.15;
    return base * 0.85;
  }
  if (prize.value >= 50) return base * 0.05;
  if (prize.value >= 20) return base * 0.15;
  if (prize.value >= 10) return base * 0.25;
  return base * 0.65;
}

export async function eligiblePrizes(input: {
  tx: Prisma.TransactionClient;
  prizes: VoucherPrize[];
  settings: VoucherSettings;
  identity: VoucherIdentity;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const stats = await getBudgetStats(now, input.tx);
  const recentVoucherWin = await hasRecentVoucherWin(input.tx, input.identity, input.settings.voucherWinCooldownDays, now);
  const activeVoucher = input.settings.blockMultipleActiveVouchers ? await hasActiveVoucher(input.tx, input.identity) : false;
  const has100 = await hasVoucher100ThisMonth(input.tx, input.identity, stats);
  const eligible: PrizeWithChance[] = [];

  for (const prize of input.prizes) {
    const normalizedType = prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type;
    if (!prize.active) continue;
    if (normalizedType !== "VOUCHER") {
      const chance = prize.baseProbability || prize.currentProbability || prize.probability;
      if (chance > 0) eligible.push({ ...prize, type: normalizedType, effectiveProbability: chance, monthUsed: 0, dayUsed: 0, weekUsed: 0 });
      continue;
    }

    const value = prize.value ?? 0;
    if (value <= 0) continue;
    if (recentVoucherWin || activeVoucher) continue;
    if (value === 100 && has100) continue;

    const [monthUsed, dayUsed, weekUsed] = await Promise.all([
      countPrizeVouchers(input.tx, prize, stats.monthStart, stats.monthEnd),
      countPrizeVouchers(input.tx, prize, stats.todayStart, stats.tomorrowStart),
      countPrizeVouchers(input.tx, prize, stats.weekStart, stats.weekEnd),
    ]);
    if (prize.monthlyQuantityLimit != null && monthUsed >= prize.monthlyQuantityLimit) continue;
    if (prize.dailyQuantityLimit != null && dayUsed >= prize.dailyQuantityLimit) continue;
    if (prize.weeklyQuantityLimit != null && weekUsed >= prize.weeklyQuantityLimit) continue;

    const chance = adjustedProbability(prize, stats, input.settings);
    if (chance > 0) eligible.push({ ...prize, type: normalizedType, effectiveProbability: chance, monthUsed, dayUsed, weekUsed });
  }

  return { prizes: eligible, stats };
}

export function pickPrize(prizes: PrizeWithChance[]) {
  const eligible = prizes.filter((item) => item.active && item.effectiveProbability > 0);
  const total = eligible.reduce((sum, item) => sum + item.effectiveProbability, 0);
  if (total <= 0) return eligible[0] ?? null;
  const roll = crypto.randomInt(0, 1_000_000) / 1_000_000 * total;
  let cursor = 0;
  for (const prize of eligible) {
    cursor += prize.effectiveProbability;
    if (roll <= cursor) return prize;
  }
  return eligible[eligible.length - 1] ?? null;
}

export async function createVoucherFromSpin(input: {
  tx?: Prisma.TransactionClient;
  spin: VoucherSpin;
  prize: VoucherPrize;
  settings?: VoucherSettings | null;
  clientId?: string | null;
  visitorId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  now?: Date;
}) {
  const tx = input.tx ?? prisma;
  const now = input.now ?? new Date();
  const value = input.prize.value ?? 0;
  const clientId = input.clientId ?? input.spin.clientId ?? null;
  const phone = normalizeVoucherPhone(input.recipientPhone ?? input.spin.recipientPhone ?? input.spin.whatsapp);
  const awaitingRegistration = value === 100 && !clientId;
  const expiresAt = awaitingRegistration
    ? voucherExpiresAtByHours(input.settings?.registrationClaimHours ?? 24, now)
    : voucherExpiresAt(input.prize, now);

  return tx.clientVoucher.create({
    data: {
      clientId,
      visitorId: input.visitorId ?? input.spin.visitorId ?? null,
      prizeId: input.prize.id,
      spinId: input.spin.id,
      code: await generateVoucherCode(tx),
      value,
      status: awaitingRegistration ? "AWAITING_REGISTRATION" : "AVAILABLE",
      expiresAt,
      requiresPayment: false,
      paymentStatus: "NOT_REQUIRED",
      whatsapp: phone || null,
      registrationRequired: awaitingRegistration,
      registrationReleasedAt: awaitingRegistration ? null : now,
      recipientName: input.recipientName ?? input.spin.recipientName ?? null,
      recipientPhone: phone || null,
    },
  });
}

export async function releaseRegistrationVouchersForUser(input: {
  userId: string;
  visitorId?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const tx = input.tx ?? prisma;
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, phone: true, email: true, document: true },
  });
  if (!user) return { count: 0 };

  const phone = normalizeVoucherPhone(user.phone);
  const whereOr: Prisma.ClientVoucherWhereInput[] = [];
  if (input.visitorId) whereOr.push({ visitorId: input.visitorId });
  if (phone) whereOr.push({ OR: [{ whatsapp: phone }, { recipientPhone: phone }] });
  if (!whereOr.length) return { count: 0 };

  const now = new Date();
  return tx.clientVoucher.updateMany({
    where: {
      OR: whereOr,
      value: 100,
      status: "AWAITING_REGISTRATION",
      expiresAt: { gt: now },
    },
    data: {
      clientId: user.id,
      status: "AVAILABLE",
      expiresAt: voucherExpiresAtByHours(24, now),
      registrationRequired: false,
      registrationReleasedAt: now,
      recipientName: user.name,
      recipientPhone: phone || null,
      whatsapp: phone || null,
    },
  });
}

export function userVoucherIdentity(user: Pick<User, "id" | "phone" | "email" | "document"> | null | undefined, extra?: Partial<VoucherIdentity>): VoucherIdentity {
  return {
    clientId: user?.id ?? extra?.clientId ?? null,
    whatsapp: normalizeVoucherPhone(user?.phone ?? extra?.whatsapp ?? null),
    email: user?.email ?? extra?.email ?? null,
    document: user?.document ?? extra?.document ?? null,
    visitorId: extra?.visitorId ?? null,
    ipAddress: extra?.ipAddress ?? null,
    userAgent: extra?.userAgent ?? null,
  };
}
