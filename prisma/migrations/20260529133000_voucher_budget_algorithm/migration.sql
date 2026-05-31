ALTER TABLE "VoucherSettings"
  ADD COLUMN IF NOT EXISTS "monthlyBudgetLimit" DOUBLE PRECISION NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS "dailyBudgetLimit" DOUBLE PRECISION NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "dailyBudgetMode" TEXT NOT NULL DEFAULT 'BLOCK_FREE_VOUCHERS',
  ADD COLUMN IF NOT EXISTS "voucherWinCooldownDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS "blockMultipleActiveVouchers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "registrationClaimHours" INTEGER NOT NULL DEFAULT 24;

CREATE TABLE IF NOT EXISTS "VoucherBudget" (
  "id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 3000,
  "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "monthlyUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dailyUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoucherBudget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VoucherBudget_month_year_key" ON "VoucherBudget"("month", "year");
CREATE INDEX IF NOT EXISTS "VoucherBudget_year_month_active_idx" ON "VoucherBudget"("year", "month", "active");

ALTER TABLE "VoucherPrize"
  ADD COLUMN IF NOT EXISTS "baseProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currentProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "monthlyQuantityLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "monthlyQuantityUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dailyQuantityLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "dailyQuantityUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "weeklyQuantityLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "expiresInHours" INTEGER;

ALTER TABLE "VoucherSpin"
  ADD COLUMN IF NOT EXISTS "voucherValue" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

ALTER TABLE "ClientVoucher"
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "registrationReleasedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "VoucherPrize_active_sortOrder_idx" ON "VoucherPrize"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "ClientVoucher_whatsapp_status_idx" ON "ClientVoucher"("whatsapp", "status");
CREATE INDEX IF NOT EXISTS "ClientVoucher_status_createdAt_idx" ON "ClientVoucher"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientVoucher_prizeId_createdAt_idx" ON "ClientVoucher"("prizeId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoucherSpin_whatsapp_createdAt_idx" ON "VoucherSpin"("whatsapp", "createdAt");

UPDATE "VoucherSettings"
SET
  "monthlyBudgetLimit" = 3000,
  "dailyBudgetLimit" = 100,
  "dailyBudgetMode" = 'BLOCK_FREE_VOUCHERS',
  "voucherWinCooldownDays" = 7,
  "blockMultipleActiveVouchers" = true,
  "registrationClaimHours" = 24
WHERE "id" = 'default';

INSERT INTO "VoucherBudget" ("id", "month", "year", "monthlyLimit", "dailyLimit", "active", "updatedAt")
VALUES (
  concat('voucher-budget-', EXTRACT(YEAR FROM CURRENT_DATE)::int, '-', EXTRACT(MONTH FROM CURRENT_DATE)::int),
  EXTRACT(MONTH FROM CURRENT_DATE)::int,
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  3000,
  100,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("month", "year") DO UPDATE
SET "monthlyLimit" = EXCLUDED."monthlyLimit",
    "dailyLimit" = EXCLUDED."dailyLimit",
    "active" = EXCLUDED."active",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "VoucherPrize" (
  "id", "name", "type", "value", "probability", "baseProbability", "currentProbability",
  "monthlyQuantityLimit", "dailyQuantityLimit", "weeklyQuantityLimit",
  "active", "requiresPayment", "paymentAmount", "expiresInDays", "expiresInHours", "sortOrder", "updatedAt"
) VALUES
  ('voucher-5', 'Voucher R$ 5', 'VOUCHER', 5, 18, 18, 18, 180, 6, NULL, true, false, NULL, 3, 72, 0, CURRENT_TIMESTAMP),
  ('voucher-10', 'Voucher R$ 10', 'VOUCHER', 10, 8, 8, 8, 90, 3, NULL, true, false, NULL, 3, 72, 1, CURRENT_TIMESTAMP),
  ('voucher-20', 'Voucher R$ 20', 'VOUCHER', 20, 3, 3, 3, 30, 1, NULL, true, false, NULL, 2, 48, 2, CURRENT_TIMESTAMP),
  ('voucher-50', 'Voucher R$ 50', 'VOUCHER', 50, 0.8, 0.8, 0.8, 8, NULL, 2, true, false, NULL, 1, 24, 3, CURRENT_TIMESTAMP),
  ('voucher-100-paid', 'Voucher R$ 100', 'VOUCHER', 100, 0.2, 0.2, 0.2, 2, NULL, NULL, true, false, NULL, 1, 24, 4, CURRENT_TIMESTAMP),
  ('try-again', 'Tente outra vez', 'TRY_AGAIN', NULL, 45, 45, 45, NULL, NULL, NULL, true, false, NULL, 0, NULL, 5, CURRENT_TIMESTAMP),
  ('try-tomorrow', 'Tente amanhã', 'TRY_TOMORROW', NULL, 25, 25, 25, NULL, NULL, NULL, true, false, NULL, 0, NULL, 6, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "type" = EXCLUDED."type",
    "value" = EXCLUDED."value",
    "probability" = EXCLUDED."probability",
    "baseProbability" = EXCLUDED."baseProbability",
    "currentProbability" = EXCLUDED."currentProbability",
    "monthlyQuantityLimit" = EXCLUDED."monthlyQuantityLimit",
    "dailyQuantityLimit" = EXCLUDED."dailyQuantityLimit",
    "weeklyQuantityLimit" = EXCLUDED."weeklyQuantityLimit",
    "requiresPayment" = EXCLUDED."requiresPayment",
    "paymentAmount" = EXCLUDED."paymentAmount",
    "expiresInDays" = EXCLUDED."expiresInDays",
    "expiresInHours" = EXCLUDED."expiresInHours",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "ClientVoucher"
SET "status" = 'AWAITING_REGISTRATION',
    "requiresPayment" = false,
    "paymentStatus" = 'NOT_REQUIRED',
    "registrationRequired" = true
WHERE "status" = 'AWAITING_PAYMENT'
  AND "value" = 100;
