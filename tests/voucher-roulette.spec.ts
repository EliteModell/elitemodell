import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrizeWithChance } from "../src/lib/voucher-roulette";
import {
  consumeDailyStock,
  pickPrize,
  rouletteCampaignAvailability,
  rouletteSpinIdentityWhere,
  monthRange,
  todayRange,
  VOUCHER_DAILY_LIMIT,
  VOUCHER_MONTHLY_LIMIT,
  weekRange,
} from "../src/lib/voucher-roulette";

const routeSource = readFileSync(
  join(process.cwd(), "src/app/api/vouchers/roulette/spin/route.ts"),
  "utf8",
);
const algorithmSource = readFileSync(
  join(process.cwd(), "src/lib/voucher-roulette.ts"),
  "utf8",
);
const publicRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/vouchers/roulette/route.ts"),
  "utf8",
);
const claimRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/vouchers/roulette/claim/route.ts"),
  "utf8",
);
const adminSource = readFileSync(
  join(process.cwd(), "src/app/(dashboard)/admin/roleta-vouchers/page.tsx"),
  "utf8",
);
const prismaSchemaSource = readFileSync(
  join(process.cwd(), "prisma/schema.prisma"),
  "utf8",
);
const modalSource = readFileSync(
  join(process.cwd(), "src/components/vouchers/VoucherRouletteModal.tsx"),
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

  test("periodos financeiros usam UTC em qualquer ambiente", () => {
    const now = new Date("2026-06-13T02:30:00.000Z");

    expect(todayRange(now)).toEqual({
      start: new Date("2026-06-13T00:00:00.000Z"),
      end: new Date("2026-06-14T00:00:00.000Z"),
    });
    expect(monthRange(now)).toMatchObject({
      start: new Date("2026-06-01T00:00:00.000Z"),
      end: new Date("2026-07-01T00:00:00.000Z"),
      month: 6,
      year: 2026,
      dayOfMonth: 13,
    });
    expect(weekRange(now)).toEqual({
      start: new Date("2026-06-08T00:00:00.000Z"),
      end: new Date("2026-06-15T00:00:00.000Z"),
    });
  });

  test("referencia promocional e opcional e informativa", () => {
    expect(adminSource).toContain(
      "const active = requestedActive",
    );
    expect(adminSource).toContain(
      "Roleta ativada sem referencia promocional por decisao administrativa aprovada em reuniao interna",
    );
    expect(prismaSchemaSource).toMatch(
      /model VoucherSettings[\s\S]*active\s+Boolean\s+@default\(true\)[\s\S]*promotionAuthorizationReference\s+String\?/,
    );
    expect(routeSource).not.toContain("hasPromotionAuthorization");
    expect(publicRouteSource).not.toContain("hasPromotionAuthorization");
  });

  test("so fica operacional com ativacao, dois premios, orcamento e estoque", () => {
    const ready = {
      settingsActive: true,
      activePrizeCount: 2,
      budgetActive: true,
      monthlyRemaining: VOUCHER_MONTHLY_LIMIT,
      dailyRemaining: VOUCHER_DAILY_LIMIT,
      stockRemainingBudget: VOUCHER_DAILY_LIMIT,
    };

    expect(rouletteCampaignAvailability(ready)).toEqual({
      active: true,
      reason: null,
    });
    expect(rouletteCampaignAvailability({ ...ready, settingsActive: false }).reason).toBe("INACTIVE");
    expect(rouletteCampaignAvailability({ ...ready, activePrizeCount: 1 }).reason).toBe("INSUFFICIENT_ACTIVE_PRIZES");
    expect(rouletteCampaignAvailability({ ...ready, budgetActive: false }).reason).toBe("BUDGET_INACTIVE");
    expect(rouletteCampaignAvailability({ ...ready, monthlyRemaining: 0 }).reason).toBe("MONTHLY_BUDGET_EXHAUSTED");
    expect(rouletteCampaignAvailability({ ...ready, dailyRemaining: 0 }).reason).toBe("DAILY_BUDGET_EXHAUSTED");
    expect(rouletteCampaignAvailability({ ...ready, stockRemainingBudget: 0 }).reason).toBe("STOCK_EXHAUSTED");
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
    expect(algorithmSource).toContain(
      'if (target === "spin" && identity.ipAddress)',
    );
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

  test("endpoint registra a validacao operacional com causa detalhada", () => {
    expect(routeSource).toContain('"eligibility_evaluated"');
    expect(routeSource).toContain("eligiblePrizeCount");
    expect(routeSource).toContain("monthlyRemaining");
    expect(routeSource).toContain("dailyRemaining");
    expect(routeSource).toContain("stockRemainingBudget");
    expect(routeSource).toContain("operational_validation_failed");
    expect(routeSource).toContain("SPIN_TRANSACTION_TIMEOUT");
    expect(routeSource).toContain("NO_ELIGIBLE_PRIZE");
    expect(routeSource).toContain("DAILY_LIMIT_REACHED");
  });

  test("contagens de limite por premio usam uma unica leitura antes do sorteio", () => {
    expect(algorithmSource).toContain("async function getPrizeUsageSnapshot");
    expect(algorithmSource).toContain("select: { prizeId: true, createdAt: true }");
    expect(algorithmSource).toContain("const usage = await getPrizeUsageSnapshot");
    expect(algorithmSource).not.toContain('by: ["prizeId"]');

    const eligibleLoop = algorithmSource.slice(
      algorithmSource.indexOf("for (const prize of input.prizes)"),
      algorithmSource.indexOf("const voucherOptions"),
    );
    expect(eligibleLoop).not.toContain("countPrizeVouchers(");
  });

  test("caminho critico consolida orcamento, estoque e antifraude", () => {
    expect(algorithmSource).toContain('AS "monthlyUsed"');
    expect(algorithmSource).toContain('AS "dailyUsed"');
    expect(algorithmSource).toContain("currentStock.reduce(");
    expect(algorithmSource).toContain("existingStock: stocks");
    expect(algorithmSource).toContain('by: ["voucherValue"]');
    expect(algorithmSource).toContain('by: ["value", "status"]');

    const eligible = algorithmSource.slice(
      algorithmSource.indexOf("export async function eligiblePrizes"),
      algorithmSource.indexOf("export function pickPrize"),
    );
    expect((eligible.match(/getRouletteBudgetStats\(/g) ?? [])).toHaveLength(1);
  });

  test("endpoint bloqueia campanha inativa sem consultar referencia promocional", () => {
    const guard = "if (!settings.active)";
    expect(routeSource).toContain(guard);
    expect(routeSource).not.toContain("promotionAuthorizationReference");
    expect(routeSource).not.toContain("hasPromotionAuthorization");
    expect(routeSource.indexOf(guard)).toBeLessThan(
      routeSource.indexOf("result = await prisma.$transaction"),
    );
  });

  test("orcamento considera todo premio comprometido no giro, mesmo antes do resgate", () => {
    expect(algorithmSource).toContain("database.voucherSpin.aggregate({");
    expect(algorithmSource).toContain('result: "VOUCHER"');
    expect(algorithmSource).toContain("_sum: { voucherValue: true }");
    expect(algorithmSource).toContain(
      "const monthlyUsed = monthCommitted._sum.voucherValue ?? 0",
    );
    expect(algorithmSource).toContain(
      "const dailyUsed = todayCommitted._sum.voucherValue ?? 0",
    );
    expect(algorithmSource).toContain(
      "Math.max(0, budget.monthlyLimit - monthlyUsed)",
    );
    expect(algorithmSource).toContain(
      "Math.max(0, Math.min(monthlyRemaining, budget.dailyLimit - dailyUsed))",
    );
  });

  test("estoque e decrementado condicionalmente e nunca pode ficar negativo", async () => {
    let stockWhere: Record<string, unknown> | null = null;
    let stockData: Record<string, unknown> | null = null;
    let budgetUpdates = 0;
    const tx = {
      voucherDailyStock: {
        updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          stockWhere = args.where;
          stockData = args.data;
          return { count: 1 };
        },
      },
      voucherBudget: {
        update: async () => {
          budgetUpdates += 1;
          return {};
        },
      },
    };
    const winningPrize = prize({
      id: "voucher-10",
      type: "VOUCHER",
      value: 10,
      dailyStock: {
        id: "stock-10",
        remainingQuantity: 1,
        remainingBudget: 10,
      } as PrizeWithChance["dailyStock"],
    });

    await consumeDailyStock({
      tx: tx as never,
      prize: winningPrize,
      stats: { budget: { id: "budget-current" } } as never,
    });

    expect(stockWhere).toMatchObject({
      id: "stock-10",
      active: true,
      remainingQuantity: { gt: 0 },
      remainingBudget: { gte: 10 },
    });
    expect(stockData).toMatchObject({
      remainingQuantity: { decrement: 1 },
      usedQuantity: { increment: 1 },
      usedBudget: { increment: 10 },
      remainingBudget: { decrement: 10 },
    });
    expect(budgetUpdates).toBe(1);
  });

  test("falha atomicamente quando outro giro consumir o ultimo estoque", async () => {
    let budgetUpdates = 0;
    const tx = {
      voucherDailyStock: {
        updateMany: async () => ({ count: 0 }),
      },
      voucherBudget: {
        update: async () => {
          budgetUpdates += 1;
          return {};
        },
      },
    };
    const winningPrize = prize({
      type: "VOUCHER",
      value: 10,
      dailyStock: {
        id: "stock-empty",
        remainingQuantity: 1,
        remainingBudget: 10,
      } as PrizeWithChance["dailyStock"],
    });

    await expect(consumeDailyStock({
      tx: tx as never,
      prize: winningPrize,
      stats: { budget: { id: "budget-current" } } as never,
    })).rejects.toThrow("estoque");
    expect(budgetUpdates).toBe(0);
  });

  test("resgate bloqueia o giro antes de verificar ou criar voucher duplicado", () => {
    const lock = claimRouteSource.indexOf('FROM "VoucherSpin"');
    const loadSpin = claimRouteSource.indexOf("tx.voucherSpin.findUnique");
    const createVoucher = claimRouteSource.indexOf("createVoucherFromSpin({");

    expect(claimRouteSource).toContain("FOR UPDATE");
    expect(lock).toBeGreaterThan(0);
    expect(loadSpin).toBeGreaterThan(lock);
    expect(createVoucher).toBeGreaterThan(loadSpin);
  });

  test("api publica mostra apenas campanha operacional e oculta as demais", () => {
    expect(publicRouteSource).toContain("rouletteCampaignAvailability({");
    expect(publicRouteSource).toContain("activePrizeCount: prizes.length");
    expect(publicRouteSource).toContain("stockRemainingBudget:");
    expect(publicRouteSource).toContain("if (!availability.active)");
    expect(publicRouteSource).toContain("active: false");
    expect(publicRouteSource).toContain("active: true");
    expect(publicRouteSource).toContain(
      "authorizationReference: settings.promotionAuthorizationReference",
    );
  });

  test("demonstracao visual nao chama giro real nem emite voucher", () => {
    expect(modalSource).toContain("MODO DEMONSTRAÇÃO · SEM PRÊMIO REAL");
    expect(modalSource).toContain("if (demoMode)");
    expect(modalSource.indexOf("if (demoMode)")).toBeLessThan(
      modalSource.indexOf('fetch("/api/vouchers/roulette/spin"'),
    );
    expect(modalSource).toContain("não registra giro, não consome estoque e não emite voucher");
  });

  test("modal omite referencia opcional quando ela nao estiver preenchida", () => {
    expect(modalSource).toContain("authorizationReference: string | null");
    expect(modalSource).toContain("config.policy.authorizationReference");
    expect(modalSource).toContain('? ` · Referência ${config.policy.authorizationReference}`');
  });

  test("modal aguarda a transacao e mostra timeout identificado", () => {
    expect(modalSource).toContain("const SPIN_API_TIMEOUT_MS = 25000");
    expect(modalSource).not.toContain("const SPIN_API_TIMEOUT_MS = 8000");
    expect(modalSource).toContain("const SPIN_DURATION_MS = 1800");
    expect(modalSource).toContain("const RESULT_REVEAL_DELAY_MS = 450");
    expect(modalSource).toContain("O servidor excedeu 25 segundos para preparar o giro");
    expect(modalSource).toContain("class SpinRequestError");
    expect(modalSource).toContain("Tentar novamente");
  });
});
