import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrizeWithChance } from "../src/lib/voucher-roulette";
import {
  hasPromotionAuthorization,
  pickPrize,
  rouletteSpinIdentityWhere,
  VOUCHER_DAILY_LIMIT,
  VOUCHER_MONTHLY_LIMIT,
} from "../src/lib/voucher-roulette";

const routeSource = readFileSync(
  join(process.cwd(), "src/app/api/vouchers/roulette/spin/route.ts"),
  "utf8",
);

function prize(overrides: Partial<PrizeWithChance>): PrizeWithChance {
  return {
    id: "prize",
    name: "Premio",
    type: "TRY_AGAIN",
    value: null,
    probability: 1,
    baseProbability: 1,
    currentProbability: 1,
    monthlyQuantityLimit: null,
    monthlyQuantityUsed: 0,
    dailyQuantityLimit: null,
    dailyQuantityUsed: 0,
    weeklyQuantityLimit: null,
    active: true,
    requiresPayment: false,
    paymentAmount: null,
    expiresInDays: 1,
    expiresInHours: null,
    sortOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    effectiveProbability: 1,
    monthUsed: 0,
    dayUsed: 0,
    weekUsed: 0,
    dailyStock: null,
    ...overrides,
  };
}

test.describe("algoritmo operacional da roleta", () => {
  test("mantem os tetos financeiros operacionais", () => {
    expect(VOUCHER_MONTHLY_LIMIT).toBe(3_000);
    expect(VOUCHER_DAILY_LIMIT).toBe(100);
  });

  test("exige referencia promocional nao vazia", () => {
    expect(hasPromotionAuthorization({ promotionAuthorizationReference: null })).toBe(false);
    expect(hasPromotionAuthorization({ promotionAuthorizationReference: "   " })).toBe(false);
    expect(hasPromotionAuthorization({ promotionAuthorizationReference: "processo-real-cadastrado" })).toBe(true);
  });

  test("nao sorteia premio com probabilidade efetiva zero", () => {
    const unavailable = prize({
      id: "sem-estoque",
      type: "VOUCHER",
      value: 100,
      effectiveProbability: 0,
    });
    const available = prize({ id: "tente-novamente", effectiveProbability: 1 });

    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(pickPrize([unavailable, available])?.id).toBe(available.id);
    }
  });

  test("identidade de visitante inclui IP contra troca de cookie", () => {
    expect(rouletteSpinIdentityWhere({
      visitorId: "visitor-1",
      ipAddress: "203.0.113.10",
    })).toEqual({
      OR: [
        { visitorId: "visitor-1" },
        { ipAddress: "203.0.113.10" },
      ],
    });
  });

  test("endpoint usa apenas a cadeia avancada dentro da transacao", () => {
    expect(routeSource).not.toContain("pickFastPrize");
    expect(routeSource).toContain("eligiblePrizes({");
    expect(routeSource).toContain("pickPrize(candidates)");
    expect(routeSource).toContain("consumeDailyStock({ tx, prize, stats })");
    expect(routeSource).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(routeSource).toContain("pg_advisory_xact_lock");

    const transactionStart = routeSource.indexOf("result = await prisma.$transaction");
    const lock = routeSource.indexOf("pg_advisory_xact_lock", transactionStart);
    const idempotencyRecheck = routeSource.indexOf(
      "tx.voucherSpin.findUnique",
      transactionStart,
    );
    const eligibility = routeSource.indexOf("eligiblePrizes({", transactionStart);
    const stockConsumption = routeSource.indexOf(
      "consumeDailyStock({ tx, prize, stats })",
      transactionStart,
    );
    const spinCreation = routeSource.indexOf(
      "tx.voucherSpin.create",
      transactionStart,
    );

    expect(transactionStart).toBeGreaterThan(0);
    expect(lock).toBeGreaterThan(transactionStart);
    expect(idempotencyRecheck).toBeGreaterThan(lock);
    expect(eligibility).toBeGreaterThan(idempotencyRecheck);
    expect(stockConsumption).toBeGreaterThan(eligibility);
    expect(spinCreation).toBeGreaterThan(stockConsumption);
  });

  test("endpoint permanece bloqueado sem ativacao e autorizacao", () => {
    const guard = "if (!settings.active || !hasPromotionAuthorization(settings))";
    expect(routeSource).toContain(guard);
    expect(routeSource.indexOf(guard)).toBeLessThan(
      routeSource.indexOf("result = await prisma.$transaction"),
    );
  });
});
