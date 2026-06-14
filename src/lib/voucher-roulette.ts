import crypto from "crypto";
import type { Prisma, User, VoucherBudget, VoucherDailyStock, VoucherPrize, VoucherSettings, VoucherSpin } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VOUCHER_VISITOR_COOKIE = "elite_voucher_visitor";
export const VOUCHER_MODAL_SESSION_KEY = "elite_voucher_modal_closed";
export const VOUCHER_MONTHLY_LIMIT = 3000;
export const VOUCHER_DAILY_LIMIT = 100;
export const ROULETTE_PROMOTION_POLICY_KEY = "roleta-promocional-policy";

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

export type RouletteAvailabilityReason =
  | "INACTIVE"
  | "INSUFFICIENT_ACTIVE_PRIZES"
  | "BUDGET_INACTIVE"
  | "MONTHLY_BUDGET_EXHAUSTED"
  | "DAILY_BUDGET_EXHAUSTED"
  | "STOCK_EXHAUSTED";

export type RouletteOperationalErrorCode =
  | "NO_ELIGIBLE_PRIZE"
  | "PRIZE_STOCK_NOT_CONFIGURED"
  | "PRIZE_STOCK_EXHAUSTED";

export class RouletteOperationalError extends Error {
  constructor(
    public readonly code: RouletteOperationalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RouletteOperationalError";
  }
}

export function rouletteCampaignAvailability(input: {
  settingsActive: boolean;
  activePrizeCount: number;
  budgetActive: boolean;
  monthlyRemaining: number;
  dailyRemaining: number;
  stockRemainingBudget: number;
}): { active: boolean; reason: RouletteAvailabilityReason | null } {
  if (!input.settingsActive) return { active: false, reason: "INACTIVE" };
  if (input.activePrizeCount < 2) {
    return { active: false, reason: "INSUFFICIENT_ACTIVE_PRIZES" };
  }
  if (!input.budgetActive) return { active: false, reason: "BUDGET_INACTIVE" };
  if (input.monthlyRemaining <= 0) {
    return { active: false, reason: "MONTHLY_BUDGET_EXHAUSTED" };
  }
  if (input.dailyRemaining <= 0) {
    return { active: false, reason: "DAILY_BUDGET_EXHAUSTED" };
  }
  if (input.stockRemainingBudget <= 0) {
    return { active: false, reason: "STOCK_EXHAUSTED" };
  }
  return { active: true, reason: null };
}

const BUDGET_STATUSES = ["AVAILABLE", "USED", "EXPIRED", "AWAITING_REGISTRATION"];
const ACTIVE_VOUCHER_STATUSES = ["AVAILABLE", "AWAITING_REGISTRATION"];
const VOUCHER_100_PRIZE_ID = "voucher-100-paid";

const DEFAULT_PRIZES = [
  { id: "voucher-5", name: "Voucher R$ 5", type: "VOUCHER", value: 5, probability: 18, monthlyQuantityLimit: 180, dailyQuantityLimit: 10, weeklyQuantityLimit: null, expiresInDays: 3, expiresInHours: 72, sortOrder: 0 },
  { id: "voucher-10", name: "Voucher R$ 10", type: "VOUCHER", value: 10, probability: 8, monthlyQuantityLimit: 90, dailyQuantityLimit: 3, weeklyQuantityLimit: null, expiresInDays: 3, expiresInHours: 72, sortOrder: 1 },
  { id: "voucher-20", name: "Voucher R$ 20", type: "VOUCHER", value: 20, probability: 3, monthlyQuantityLimit: 30, dailyQuantityLimit: 1, weeklyQuantityLimit: null, expiresInDays: 2, expiresInHours: 48, sortOrder: 2 },
  { id: "voucher-50", name: "Voucher R$ 50", type: "VOUCHER", value: 50, probability: 0.8, monthlyQuantityLimit: 8, dailyQuantityLimit: null, weeklyQuantityLimit: 2, expiresInDays: 1, expiresInHours: 24, sortOrder: 3 },
  { id: VOUCHER_100_PRIZE_ID, name: "Voucher R$ 100", type: "VOUCHER", value: 100, probability: 0.2, monthlyQuantityLimit: 2, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 1, expiresInHours: 24, sortOrder: 4 },
  { id: "near-miss", name: "Quase lá!", type: "TRY_AGAIN", value: null, probability: 20, monthlyQuantityLimit: null, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 0, expiresInHours: null, sortOrder: 5 },
  { id: "try-again", name: "Mais sorte na próxima", type: "TRY_AGAIN", value: null, probability: 25, monthlyQuantityLimit: null, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 0, expiresInHours: null, sortOrder: 6 },
  { id: "try-tomorrow", name: "Tente amanhã", type: "TRY_TOMORROW", value: null, probability: 25, monthlyQuantityLimit: null, dailyQuantityLimit: null, weeklyQuantityLimit: null, expiresInDays: 0, expiresInHours: null, sortOrder: 7 },
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
  spinsToday: number;
  winnersToday: number;
  noPrizeToday: number;
  dailyStockInitialBudget: number;
  dailyStockUsedBudget: number;
  dailyStockRemainingBudget: number;
  dailyStockExpiredBudget: number;
  dailyStockCarryoverToNext: number;
};

type RouletteBudgetStats = Pick<
  BudgetStats,
  | "budget"
  | "monthStart"
  | "monthEnd"
  | "todayStart"
  | "tomorrowStart"
  | "weekStart"
  | "weekEnd"
  | "monthlyUsed"
  | "monthlyRemaining"
  | "dailyUsed"
  | "dailyRemaining"
  | "spinsToday"
  | "winnersToday"
  | "noPrizeToday"
  | "dailyStockRemainingBudget"
>;

export type PrizeWithChance = VoucherPrize & {
  effectiveProbability: number;
  monthUsed: number;
  dayUsed: number;
  weekUsed: number;
  dailyStock?: VoucherDailyStock | null;
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
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function monthRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end, month, year, dayOfMonth: now.getUTCDate() };
}

export function weekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function db<T extends Prisma.TransactionClient | typeof prisma>(tx?: T) {
  return tx ?? prisma;
}

function sameDayId(date: Date, suffix: string) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `voucher-stock-${yyyy}-${mm}-${dd}-${suffix}`;
}

function rareDayNumber(seed: number, maxDay: number) {
  return (Math.abs(seed) % maxDay) + 1;
}

function isVoucher100Day(now: Date) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = rareDayNumber(year * 37 + month * 19, monthDays);
  const second = Math.min(monthDays, first + 14);
  return now.getUTCDate() === first || now.getUTCDate() === second;
}

function isVoucher50Day(now: Date) {
  const { start } = weekRange(now);
  const weeklySlot = Math.abs(start.getUTCFullYear() * 31 + start.getUTCMonth() * 11 + start.getUTCDate()) % 7;
  return now.getUTCDay() === weeklySlot || now.getUTCDay() === (weeklySlot + 3) % 7;
}

async function lockVoucherBudget(tx: Prisma.TransactionClient, budgetId: string) {
  await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "VoucherBudget" WHERE "id" = ${budgetId} FOR UPDATE`;
}

async function lockDailyStockRows(tx: Prisma.TransactionClient, date: Date) {
  return tx.$queryRaw<VoucherDailyStock[]>`
    SELECT *
    FROM "VoucherDailyStock"
    WHERE "date" = ${date}
    ORDER BY "prizeValue" ASC, "createdAt" ASC
    FOR UPDATE
  `;
}

export async function updateExpiredVouchers(now = new Date(), tx?: Prisma.TransactionClient) {
  await db(tx).clientVoucher.updateMany({
    where: {
      status: { in: ["AVAILABLE", "AWAITING_REGISTRATION", "AWAITING_PAYMENT"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const { start: todayStart } = todayRange(now);
  await db(tx).voucherDailyStock.updateMany({
    where: {
      date: { lt: todayStart },
      active: false,
      remainingBudget: { gt: 0 },
    },
    data: {
      active: false,
      expiredBudget: { increment: 0 },
      carryoverToNext: 0,
    },
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

export async function getVoucherSettings(now = new Date()) {
  const settings = await prisma.voucherSettings.findUnique({ where: { id: "default" } });
  return settings ?? ensureVoucherDefaults(now);
}

export async function activePrizes(tx?: Prisma.TransactionClient) {
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

export function rouletteSpinIdentityWhere(identity: VoucherIdentity): Prisma.VoucherSpinWhereInput {
  const phone = normalizeVoucherPhone(identity.whatsapp);
  const userOr: Prisma.UserWhereInput[] = [
    ...(phone ? [{ phone }] : []),
    ...(identity.email ? [{ email: identity.email }] : []),
    ...(identity.document ? [{ document: identity.document }] : []),
  ];
  const or: Prisma.VoucherSpinWhereInput[] = [];

  if (identity.clientId) or.push({ clientId: identity.clientId });
  if (userOr.length) or.push({ client: { is: { OR: userOr } } });
  if (identity.visitorId) or.push({ visitorId: identity.visitorId });
  if (identity.ipAddress) or.push({ ipAddress: identity.ipAddress });

  return or.length ? { OR: or } : {};
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

  const [monthCommitted, todayCommitted, issued, used, expired, awaitingRegistration, spinsToday, winnersToday, stockRows] = await Promise.all([
    database.voucherSpin.aggregate({
      where: {
        result: "VOUCHER",
        voucherValue: { gt: 0 },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { voucherValue: true },
    }),
    database.voucherSpin.aggregate({
      where: {
        result: "VOUCHER",
        voucherValue: { gt: 0 },
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { voucherValue: true },
    }),
    database.clientVoucher.count({ where: { ...budgetWhere, createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "USED", createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "EXPIRED", createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.clientVoucher.count({ where: { ...budgetWhere, status: "AWAITING_REGISTRATION", createdAt: { gte: monthStart, lt: monthEnd } } }),
    database.voucherSpin.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
    database.voucherSpin.count({ where: { result: "VOUCHER", voucherValue: { gt: 0 }, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
    database.voucherDailyStock.findMany({ where: { date: todayStart } }),
  ]);

  const monthlyUsed = monthCommitted._sum.voucherValue ?? 0;
  const dailyUsed = todayCommitted._sum.voucherValue ?? 0;
  const monthlyRemaining = Math.max(0, budget.monthlyLimit - monthlyUsed);
  const dailyAllowance = Math.max(0, Math.min(budget.dailyLimit, monthlyRemaining + dailyUsed));
  const dailyRemaining = Math.max(0, Math.min(monthlyRemaining, budget.dailyLimit - dailyUsed));
  const dailyStockInitialBudget = stockRows.reduce((sum, stock) => sum + stock.initialBudget, 0);
  const dailyStockUsedBudget = stockRows.reduce((sum, stock) => sum + stock.usedBudget, 0);
  const dailyStockRemainingBudget = stockRows.reduce((sum, stock) => sum + stock.remainingBudget, 0);
  const dailyStockExpiredBudget = stockRows.reduce((sum, stock) => sum + stock.expiredBudget, 0);
  const dailyStockCarryoverToNext = stockRows.reduce((sum, stock) => sum + stock.carryoverToNext, 0);

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
    spinsToday,
    winnersToday,
    noPrizeToday: Math.max(0, spinsToday - winnersToday),
    dailyStockInitialBudget,
    dailyStockUsedBudget,
    dailyStockRemainingBudget,
    dailyStockExpiredBudget,
    dailyStockCarryoverToNext,
  };
}

async function getRouletteBudgetStats(
  now: Date,
  tx: Prisma.TransactionClient,
  currentBudget?: VoucherBudget,
  currentStock: VoucherDailyStock[] = [],
): Promise<RouletteBudgetStats> {
  const budget = currentBudget ?? await getCurrentBudget(now, tx);
  const { start: monthStart, end: monthEnd } = monthRange(now);
  const { start: todayStart, end: tomorrowStart } = todayRange(now);
  const { start: weekStart, end: weekEnd } = weekRange(now);

  const [aggregate] = await tx.$queryRaw<Array<{
    monthlyUsed: number | null;
    dailyUsed: number | null;
    spinsToday: bigint;
    winnersToday: bigint;
  }>>`
    SELECT
      COALESCE(SUM("voucherValue") FILTER (
        WHERE "result" = 'VOUCHER'
          AND "voucherValue" > 0
      ), 0)::double precision AS "monthlyUsed",
      COALESCE(SUM("voucherValue") FILTER (
        WHERE "result" = 'VOUCHER'
          AND "voucherValue" > 0
          AND "createdAt" >= ${todayStart}
          AND "createdAt" < ${tomorrowStart}
      ), 0)::double precision AS "dailyUsed",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${todayStart}
          AND "createdAt" < ${tomorrowStart}
      ) AS "spinsToday",
      COUNT(*) FILTER (
        WHERE "result" = 'VOUCHER'
          AND "voucherValue" > 0
          AND "createdAt" >= ${todayStart}
          AND "createdAt" < ${tomorrowStart}
      ) AS "winnersToday"
    FROM "VoucherSpin"
    WHERE "createdAt" >= ${monthStart}
      AND "createdAt" < ${monthEnd}
  `;

  const monthlyUsed = Number(aggregate?.monthlyUsed ?? 0);
  const dailyUsed = Number(aggregate?.dailyUsed ?? 0);
  const spinsToday = Number(aggregate?.spinsToday ?? 0);
  const winnersToday = Number(aggregate?.winnersToday ?? 0);
  const monthlyRemaining = Math.max(0, budget.monthlyLimit - monthlyUsed);
  const dailyRemaining = Math.max(0, Math.min(monthlyRemaining, budget.dailyLimit - dailyUsed));

  return {
    budget,
    monthStart,
    monthEnd,
    todayStart,
    tomorrowStart,
    weekStart,
    weekEnd,
    monthlyUsed,
    monthlyRemaining,
    dailyUsed,
    dailyRemaining,
    spinsToday,
    winnersToday,
    noPrizeToday: Math.max(0, spinsToday - winnersToday),
    dailyStockRemainingBudget: currentStock.reduce(
      (sum, stock) => sum + stock.remainingBudget,
      0,
    ),
  };
}

type PrizeUsageSnapshot = {
  month: Map<string, number>;
  day: Map<string, number>;
  week: Map<string, number>;
};

async function getPrizeUsageSnapshot(
  tx: Prisma.TransactionClient,
  prizeIds: string[],
  stats: RouletteBudgetStats,
): Promise<PrizeUsageSnapshot> {
  const empty = {
    month: new Map<string, number>(),
    day: new Map<string, number>(),
    week: new Map<string, number>(),
  };
  if (!prizeIds.length) return empty;

  const rangeStart = stats.weekStart < stats.monthStart
    ? stats.weekStart
    : stats.monthStart;
  const rangeEnd = stats.weekEnd > stats.monthEnd
    ? stats.weekEnd
    : stats.monthEnd;
  const rows = await tx.clientVoucher.findMany({
    where: {
      prizeId: { in: prizeIds },
      status: { in: BUDGET_STATUSES },
      createdAt: { gte: rangeStart, lt: rangeEnd },
    },
    select: { prizeId: true, createdAt: true },
  });

  const increment = (map: Map<string, number>, prizeId: string) => {
    map.set(prizeId, (map.get(prizeId) ?? 0) + 1);
  };
  for (const row of rows) {
    if (!row.prizeId) continue;
    if (row.createdAt >= stats.monthStart && row.createdAt < stats.monthEnd) {
      increment(empty.month, row.prizeId);
    }
    if (row.createdAt >= stats.todayStart && row.createdAt < stats.tomorrowStart) {
      increment(empty.day, row.prizeId);
    }
    if (row.createdAt >= stats.weekStart && row.createdAt < stats.weekEnd) {
      increment(empty.week, row.prizeId);
    }
  }
  return empty;
}

function getRemainingQuantityLimit(
  prize: VoucherPrize,
  usage: PrizeUsageSnapshot,
  now: Date,
) {
  const monthUsed = usage.month.get(prize.id) ?? 0;
  const dayUsed = usage.day.get(prize.id) ?? 0;
  const weekUsed = usage.week.get(prize.id) ?? 0;
  const limits = [
    prize.monthlyQuantityLimit == null ? Number.POSITIVE_INFINITY : Math.max(0, prize.monthlyQuantityLimit - monthUsed),
    prize.dailyQuantityLimit == null ? Number.POSITIVE_INFINITY : Math.max(0, prize.dailyQuantityLimit - dayUsed),
    prize.weeklyQuantityLimit == null ? Number.POSITIVE_INFINITY : Math.max(0, prize.weeklyQuantityLimit - weekUsed),
  ];
  if ((prize.value ?? 0) === 100 && !isVoucher100Day(now)) return 0;
  if ((prize.value ?? 0) === 50 && !isVoucher50Day(now)) return 0;
  return Math.floor(Math.min(...limits));
}

export async function ensureDailyPrizeStock(input?: {
  tx?: Prisma.TransactionClient;
  settings?: VoucherSettings | null;
  stats?: RouletteBudgetStats;
  now?: Date;
  existingStock?: VoucherDailyStock[];
  prizes?: VoucherPrize[];
  usage?: PrizeUsageSnapshot;
}) {
  const now = input?.now ?? new Date();
  const tx = input?.tx ?? prisma;
  const settings = input?.settings ?? await tx.voucherSettings.findUnique({ where: { id: "default" } });
  const stats = input?.stats ?? await getBudgetStats(now, input?.tx);
  const { start: todayStart } = todayRange(now);

  if (!stats.budget.active || stats.monthlyRemaining <= 0 || stats.dailyRemaining <= 0) {
    await tx.voucherDailyStock.updateMany({
      where: { date: todayStart, active: true },
      data: { active: false },
    });
    return [];
  }

  const existing = input?.existingStock ?? await tx.voucherDailyStock.findMany({
    where: { date: todayStart },
    orderBy: [{ prizeValue: "asc" }, { createdAt: "asc" }],
  });
  if (existing.length) {
    const shouldReactivate = existing.some(
      (stock) => !stock.active && stock.remainingQuantity > 0 && stock.remainingBudget > 0,
    );
    if (!shouldReactivate) return existing;

    await tx.voucherDailyStock.updateMany({
      where: {
        date: todayStart,
        active: false,
        remainingQuantity: { gt: 0 },
        remainingBudget: { gt: 0 },
      },
      data: { active: true },
    });
    return existing.map((stock) => (
      !stock.active && stock.remainingQuantity > 0 && stock.remainingBudget > 0
        ? { ...stock, active: true }
        : stock
    ));
  }

  await tx.voucherDailyStock.updateMany({
    where: {
      date: { lt: todayStart },
      active: true,
    },
    data: {
      active: false,
      carryoverToNext: 0,
    },
  });
  await tx.$executeRaw`UPDATE "VoucherDailyStock" SET "expiredBudget" = "remainingBudget", "remainingBudget" = 0, "remainingQuantity" = 0 WHERE "date" < ${todayStart} AND "expiredBudget" = 0 AND "remainingBudget" > 0`;

  const prizes = input?.prizes?.filter(
    (prize) => prize.active && ["VOUCHER", "PAID_VOUCHER"].includes(prize.type) && (prize.value ?? 0) > 0,
  ) ?? await tx.voucherPrize.findMany({
      where: { active: true, type: { in: ["VOUCHER", "PAID_VOUCHER"] }, value: { gt: 0 } },
      orderBy: [{ value: "asc" }, { sortOrder: "asc" }],
    });
  const usage = input?.usage ?? await getPrizeUsageSnapshot(
    tx,
    prizes.map((prize) => prize.id),
    stats,
  );
  const byValue = new Map(prizes.map((prize) => [Math.round(prize.value ?? 0), prize]));
  let remainingBudget = Math.max(0, Math.min(settings?.dailyBudgetLimit ?? VOUCHER_DAILY_LIMIT, stats.budget.dailyLimit, stats.monthlyRemaining));
  const stockRows: Prisma.VoucherDailyStockCreateManyInput[] = [];

  function addStock(value: number, desiredQuantity: number) {
    const prize = byValue.get(value);
    if (!prize || remainingBudget < value || desiredQuantity <= 0) return;
    const remainingLimit = getRemainingQuantityLimit(prize, usage, now);
    const quantity = Math.max(0, Math.min(desiredQuantity, remainingLimit, Math.floor(remainingBudget / value)));
    if (!quantity) return;
    const budget = quantity * value;
    remainingBudget -= budget;
    stockRows.push({
      id: sameDayId(todayStart, prize.id),
      date: todayStart,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeValue: value,
      initialQuantity: quantity,
      remainingQuantity: quantity,
      usedQuantity: 0,
      initialBudget: budget,
      usedBudget: 0,
      remainingBudget: budget,
      carryoverFromPrevious: 0,
      carryoverToNext: 0,
      expiredBudget: 0,
      active: true,
    });
  }

  if (remainingBudget >= 100 && byValue.has(100) && isVoucher100Day(now)) {
    addStock(100, 1);
  } else {
    if (remainingBudget >= 50 && byValue.has(50) && isVoucher50Day(now)) {
      addStock(5, 4);
      addStock(10, 3);
      addStock(50, 1);
    } else {
      addStock(5, 10);
      addStock(10, 3);
      addStock(20, 1);
    }
  }

  if (stockRows.length) {
    await tx.voucherDailyStock.createMany({ data: stockRows, skipDuplicates: true });
  }

  return tx.voucherDailyStock.findMany({
    where: { date: todayStart },
    orderBy: [{ prizeValue: "asc" }, { createdAt: "asc" }],
  });
}

function identityOr(identity: VoucherIdentity, target: "spin" | "voucher" = "spin") {
  const phone = normalizeVoucherPhone(identity.whatsapp);
  const or: Prisma.VoucherSpinWhereInput[] | Prisma.ClientVoucherWhereInput[] = [];

  if (identity.clientId) or.push({ clientId: identity.clientId } as never);
  if (identity.visitorId) or.push({ visitorId: identity.visitorId } as never);
  if (target === "spin" && identity.ipAddress) {
    or.push({ ipAddress: identity.ipAddress } as never);
  }
  if (phone) {
    if (target === "spin") or.push({ OR: [{ whatsapp: phone }, { recipientPhone: phone }] } as never);
    else or.push({ OR: [{ whatsapp: phone }, { recipientPhone: phone }] } as never);
  }
  return or;
}

async function getIdentityEligibility(
  tx: Prisma.TransactionClient,
  identity: VoucherIdentity,
  cooldownDays: number,
  stats: RouletteBudgetStats,
  now: Date,
) {
  const since = new Date(now);
  since.setDate(since.getDate() - Math.max(1, cooldownDays));
  const spinOr = identityOr(identity, "spin") as Prisma.VoucherSpinWhereInput[];
  const voucherOr = identityOr(identity, "voucher") as Prisma.ClientVoucherWhereInput[];
  const phone = normalizeVoucherPhone(identity.whatsapp);
  const userOr: Prisma.UserWhereInput[] = [
    ...(identity.email ? [{ email: identity.email }] : []),
    ...(identity.document ? [{ document: identity.document }] : []),
    ...(phone ? [{ phone }] : []),
  ];
  const voucherIdentities: Prisma.ClientVoucherWhereInput[] = [
    ...voucherOr,
    ...(userOr.length ? [{ client: { is: { OR: userOr } } }] : []),
  ];
  const earliestSpinDate = since < stats.monthStart ? since : stats.monthStart;
  const spinGroups = spinOr.length
    ? await tx.voucherSpin.groupBy({
      by: ["voucherValue"],
      where: {
        OR: spinOr,
        result: "VOUCHER",
        voucherValue: { gt: 0 },
        createdAt: { gte: earliestSpinDate, lt: stats.monthEnd },
      },
      _max: { createdAt: true },
    })
    : [];
  const voucherGroups = voucherIdentities.length
    ? await tx.clientVoucher.groupBy({
      by: ["value", "status"],
      where: {
        OR: voucherIdentities,
        AND: [{
          OR: [
            {
              status: { in: ACTIVE_VOUCHER_STATUSES },
              expiresAt: { gt: now },
            },
            {
              value: 100,
              status: { in: BUDGET_STATUSES },
              createdAt: { gte: stats.monthStart, lt: stats.monthEnd },
            },
          ],
        }],
      },
      _max: { expiresAt: true, createdAt: true },
    })
    : [];

  return {
    recentVoucherWin: spinGroups.some(
      (spin) => Boolean(spin._max.createdAt && spin._max.createdAt >= since),
    ),
    activeVoucher: voucherGroups.some(
      (voucher) =>
        ACTIVE_VOUCHER_STATUSES.includes(voucher.status) &&
        Boolean(voucher._max.expiresAt && voucher._max.expiresAt > now),
    ),
    hasVoucher100ThisMonth:
      spinGroups.some(
        (spin) =>
          spin.voucherValue === 100 &&
          Boolean(spin._max.createdAt && spin._max.createdAt >= stats.monthStart),
      ) ||
      voucherGroups.some(
        (voucher) =>
          voucher.value === 100 &&
          BUDGET_STATUSES.includes(voucher.status) &&
          Boolean(
            voucher._max.createdAt &&
            voucher._max.createdAt >= stats.monthStart &&
            voucher._max.createdAt < stats.monthEnd,
          ),
      ),
  };
}

function adjustedProbability(prize: VoucherPrize, stats: RouletteBudgetStats, settings: VoucherSettings, stock?: VoucherDailyStock | null) {
  const base = prize.baseProbability || prize.currentProbability || prize.probability;
  if (prize.type !== "VOUCHER" || !prize.value) return base;
  if (!stats.budget.active || stats.monthlyRemaining < prize.value || stats.dailyRemaining < prize.value) return 0;
  if (!stock || !stock.active || stock.remainingQuantity <= 0 || stock.remainingBudget < prize.value) return 0;
  if (settings.dailyBudgetMode === "BLOCK_FREE_VOUCHERS" && stats.dailyRemaining < prize.value) return 0;

  const remainingRatio = stats.budget.monthlyLimit > 0 ? stats.monthlyRemaining / stats.budget.monthlyLimit : 0;
  const stockRatio = stock.initialQuantity > 0 ? stock.remainingQuantity / stock.initialQuantity : 0;
  let multiplier = 1;

  if (stats.spinsToday < 12) {
    if (prize.value <= 10) multiplier *= 1.9;
    else if (prize.value === 20) multiplier *= 1.35;
    else if (prize.value === 50) multiplier *= 0.7;
    else if (prize.value === 100) multiplier *= 0.35;
  }
  if (stats.winnersToday === 0 && stats.spinsToday >= 6 && prize.value <= 10) multiplier *= 2.1;
  if (stats.noPrizeToday >= 10 && prize.value <= 10) multiplier *= 1.45;
  if (stockRatio <= 0.25) multiplier *= 0.62;
  if (stock.remainingQuantity <= 1) multiplier *= 0.45;

  if (remainingRatio <= 0.7 && remainingRatio > 0.3) {
    if (prize.value >= 50) multiplier *= 0.35;
    else if (prize.value >= 20) multiplier *= 0.55;
    else if (prize.value === 5) multiplier *= 1.15;
    else multiplier *= 0.85;
  } else if (remainingRatio <= 0.3) {
    if (prize.value >= 50) multiplier *= 0.05;
    else if (prize.value >= 20) multiplier *= 0.15;
    else if (prize.value >= 10) multiplier *= 0.25;
    else multiplier *= 0.65;
  }

  return Math.max(0, base * multiplier);
}

export async function eligiblePrizes(input: {
  tx: Prisma.TransactionClient;
  prizes: VoucherPrize[];
  settings: VoucherSettings;
  identity: VoucherIdentity;
  now?: Date;
  budget?: VoucherBudget;
}) {
  const now = input.now ?? new Date();
  const budget = input.budget ?? await getCurrentBudget(now, input.tx);
  await lockVoucherBudget(input.tx, budget.id);
  const { start: todayStart } = todayRange(now);
  let stocks = await lockDailyStockRows(input.tx, todayStart);
  const stats = await getRouletteBudgetStats(now, input.tx, budget, stocks);
  const voucherPrizeIds = input.prizes
    .filter((prize) => prize.active && ["VOUCHER", "PAID_VOUCHER"].includes(prize.type))
    .map((prize) => prize.id);
  const usage = await getPrizeUsageSnapshot(input.tx, voucherPrizeIds, stats);
  stocks = await ensureDailyPrizeStock({
    tx: input.tx,
    settings: input.settings,
    stats,
    now,
    existingStock: stocks,
    prizes: input.prizes,
    usage,
  });
  if (!stocks.length) {
    stocks = await lockDailyStockRows(input.tx, todayStart);
  }
  stats.dailyStockRemainingBudget = stocks.reduce(
    (sum, stock) => sum + stock.remainingBudget,
    0,
  );
  const identityEligibility = await getIdentityEligibility(
    input.tx,
    input.identity,
    input.settings.voucherWinCooldownDays,
    stats,
    now,
  );
  const recentVoucherWin = identityEligibility.recentVoucherWin;
  const activeVoucher = input.settings.blockMultipleActiveVouchers
    ? identityEligibility.activeVoucher
    : false;
  const has100 = identityEligibility.hasVoucher100ThisMonth;
  const stockByPrize = new Map(stocks.map((stock) => [stock.prizeId, stock]));
  const eligible: PrizeWithChance[] = [];

  for (const prize of input.prizes) {
    const normalizedType = prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type;
    if (!prize.active) continue;
    if (normalizedType !== "VOUCHER") {
      const chance = prize.baseProbability || prize.currentProbability || prize.probability;
      if (chance > 0) eligible.push({ ...prize, type: normalizedType, effectiveProbability: chance, monthUsed: 0, dayUsed: 0, weekUsed: 0, dailyStock: null });
      continue;
    }

    const value = prize.value ?? 0;
    if (value <= 0) continue;
    if (recentVoucherWin || activeVoucher) continue;
    if (value === 100 && has100) continue;

    const stock = stockByPrize.get(prize.id) ?? null;
    const monthUsed = usage.month.get(prize.id) ?? 0;
    const dayUsed = usage.day.get(prize.id) ?? 0;
    const weekUsed = usage.week.get(prize.id) ?? 0;
    if (prize.monthlyQuantityLimit != null && monthUsed >= prize.monthlyQuantityLimit) continue;
    if (prize.dailyQuantityLimit != null && dayUsed >= prize.dailyQuantityLimit) continue;
    if (prize.weeklyQuantityLimit != null && weekUsed >= prize.weeklyQuantityLimit) continue;

    const chance = adjustedProbability(prize, stats, input.settings, stock);
    if (chance > 0) eligible.push({ ...prize, type: normalizedType, effectiveProbability: chance, monthUsed, dayUsed, weekUsed, dailyStock: stock });
  }

  const voucherOptions = eligible.filter((item) => item.type === "VOUCHER" && (item.value ?? 0) > 0);
  if (voucherOptions.length && stats.winnersToday === 0 && stats.spinsToday >= 12) {
    for (const prize of eligible) {
      if (prize.type !== "VOUCHER") prize.effectiveProbability = 0;
      else if ((prize.value ?? 0) <= 10) prize.effectiveProbability *= 3;
    }
  } else if (voucherOptions.length && stats.noPrizeToday >= 10) {
    for (const prize of eligible) {
      if (prize.type !== "VOUCHER") prize.effectiveProbability *= 0.45;
      else if ((prize.value ?? 0) <= 10) prize.effectiveProbability *= 1.6;
    }
  }

  return {
    prizes: eligible,
    stats,
    diagnostics: {
      activePrizeCount: input.prizes.filter((prize) => prize.active).length,
      eligiblePrizeCount: eligible.length,
      eligibleVoucherCount: eligible.filter((prize) => prize.type === "VOUCHER").length,
      recentVoucherWin,
      activeVoucher,
      hasVoucher100ThisMonth: has100,
    },
  };
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

export async function consumeDailyStock(input: {
  tx: Prisma.TransactionClient;
  prize: PrizeWithChance;
  stats: RouletteBudgetStats;
}) {
  const value = input.prize.value ?? 0;
  const stock = input.prize.dailyStock;
  if (value <= 0) return null;
  if (!stock) {
    throw new RouletteOperationalError(
      "PRIZE_STOCK_NOT_CONFIGURED",
      "O prêmio sorteado não possui estoque configurado para hoje.",
    );
  }

  const updated = await input.tx.voucherDailyStock.updateMany({
    where: {
      id: stock.id,
      active: true,
      remainingQuantity: { gt: 0 },
      remainingBudget: { gte: value },
    },
    data: {
      remainingQuantity: { decrement: 1 },
      usedQuantity: { increment: 1 },
      usedBudget: { increment: value },
      remainingBudget: { decrement: value },
    },
  });
  if (updated.count !== 1) {
    throw new RouletteOperationalError(
      "PRIZE_STOCK_EXHAUSTED",
      "O estoque do prêmio sorteado acabou durante este giro.",
    );
  }

  await input.tx.voucherBudget.update({
    where: { id: input.stats.budget.id },
    data: {
      monthlyUsed: { increment: value },
      dailyUsed: { increment: value },
    },
  });

  return stock;
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
  const awaitingRegistration = !clientId;
  const pendingSmallGuest = awaitingRegistration && value < 100 && !phone;
  const expiresAt = pendingSmallGuest
    ? input.spin.pendingExpiresAt ?? voucherExpiresAtByHours(input.settings?.pendingClaimMinutes ? input.settings.pendingClaimMinutes / 60 : 1, now)
    : awaitingRegistration && value === 100
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
  const vouchers = await tx.clientVoucher.findMany({
    where: {
      OR: whereOr,
      status: "AWAITING_REGISTRATION",
      expiresAt: { gt: now },
    },
    include: { prize: true },
  });

  for (const voucher of vouchers) {
    await tx.clientVoucher.update({
      where: { id: voucher.id },
      data: {
        clientId: user.id,
        status: "AVAILABLE",
        expiresAt: voucher.prize ? voucherExpiresAt(voucher.prize, now) : voucherExpiresAtByHours(24, now),
        registrationRequired: false,
        registrationReleasedAt: now,
        recipientName: user.name,
        recipientPhone: phone || voucher.recipientPhone,
        whatsapp: phone || voucher.whatsapp,
      },
    });
  }

  return { count: vouchers.length };
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
