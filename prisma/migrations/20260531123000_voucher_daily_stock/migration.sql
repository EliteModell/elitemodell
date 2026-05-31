CREATE TABLE IF NOT EXISTS "VoucherDailyStock" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "prizeId" TEXT NOT NULL,
  "prizeName" TEXT NOT NULL,
  "prizeValue" DOUBLE PRECISION NOT NULL,
  "initialQuantity" INTEGER NOT NULL,
  "remainingQuantity" INTEGER NOT NULL,
  "usedQuantity" INTEGER NOT NULL DEFAULT 0,
  "initialBudget" DOUBLE PRECISION NOT NULL,
  "usedBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingBudget" DOUBLE PRECISION NOT NULL,
  "carryoverFromPrevious" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carryoverToNext" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expiredBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoucherDailyStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VoucherDailyStock_date_prizeId_key" ON "VoucherDailyStock"("date", "prizeId");
CREATE INDEX IF NOT EXISTS "VoucherDailyStock_date_active_idx" ON "VoucherDailyStock"("date", "active");
CREATE INDEX IF NOT EXISTS "VoucherDailyStock_prizeId_date_idx" ON "VoucherDailyStock"("prizeId", "date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VoucherDailyStock_prizeId_fkey') THEN
    ALTER TABLE "VoucherDailyStock" ADD CONSTRAINT "VoucherDailyStock_prizeId_fkey"
      FOREIGN KEY ("prizeId") REFERENCES "VoucherPrize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "VoucherPrize"
SET "dailyQuantityLimit" = 10,
    "monthlyQuantityLimit" = 180,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'voucher-5'
  AND ("dailyQuantityLimit" IS NULL OR "dailyQuantityLimit" < 10);

INSERT INTO "VoucherPrize" (
  "id", "name", "type", "value", "probability", "baseProbability", "currentProbability",
  "monthlyQuantityLimit", "dailyQuantityLimit", "weeklyQuantityLimit",
  "active", "requiresPayment", "paymentAmount", "expiresInDays", "expiresInHours", "sortOrder", "updatedAt"
) VALUES
  ('near-miss', 'Quase lá!', 'TRY_AGAIN', NULL, 20, 20, 20, NULL, NULL, NULL, true, false, NULL, 0, NULL, 5, CURRENT_TIMESTAMP),
  ('better-luck-next', 'Mais sorte na próxima', 'TRY_AGAIN', NULL, 25, 25, 25, NULL, NULL, NULL, true, false, NULL, 0, NULL, 6, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "type" = EXCLUDED."type",
    "value" = EXCLUDED."value",
    "probability" = EXCLUDED."probability",
    "baseProbability" = EXCLUDED."baseProbability",
    "currentProbability" = EXCLUDED."currentProbability",
    "active" = EXCLUDED."active",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "VoucherPrize"
SET "name" = 'Tente amanhã',
    "probability" = 25,
    "baseProbability" = 25,
    "currentProbability" = 25,
    "sortOrder" = 7,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'try-tomorrow';

UPDATE "VoucherPrize"
SET "name" = 'Mais sorte na próxima',
    "probability" = 25,
    "baseProbability" = 25,
    "currentProbability" = 25,
    "sortOrder" = 6,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'try-again';
