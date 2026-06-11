ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CHARGEBACK';

ALTER TABLE "Booking"
ADD COLUMN "subtotalCents" INTEGER,
ADD COLUMN "cleaningFeeCents" INTEGER,
ADD COLUMN "serviceFeeCents" INTEGER,
ADD COLUMN "discountCents" INTEGER,
ADD COLUMN "totalPriceCents" INTEGER,
ADD COLUMN "hostPayoutCents" INTEGER,
ADD COLUMN "payoutStatus" TEXT NOT NULL DEFAULT 'NOT_SCHEDULED',
ADD COLUMN "disputeStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "termsVersionId" TEXT,
ADD COLUMN "refundPolicyVersionId" TEXT,
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "acceptanceIp" TEXT,
ADD COLUMN "acceptanceUserAgent" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "amountCents" INTEGER,
ADD COLUMN "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "providerUpdatedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN "benefitStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "benefitAppliedAt" TIMESTAMP(3),
ADD COLUMN "benefitReversedAt" TIMESTAMP(3),
ADD COLUMN "benefitError" TEXT;

DROP INDEX IF EXISTS "Payment_bookingId_key";
CREATE INDEX "Payment_bookingId_createdAt_idx" ON "Payment"("bookingId", "createdAt");

UPDATE "Payment"
SET "amountCents" = ROUND("amount" * 100)::INTEGER
WHERE "amountCents" IS NULL;

UPDATE "Booking"
SET
  "subtotalCents" = ROUND(("nights" * "pricePerNight") * 100)::INTEGER,
  "cleaningFeeCents" = ROUND("cleaningFee" * 100)::INTEGER,
  "serviceFeeCents" = ROUND("serviceFee" * 100)::INTEGER,
  "discountCents" = ROUND("discount" * 100)::INTEGER,
  "totalPriceCents" = ROUND("totalPrice" * 100)::INTEGER,
  "hostPayoutCents" = ROUND(COALESCE("hostPayout", 0) * 100)::INTEGER
WHERE "totalPriceCents" IS NULL;

CREATE TABLE "PaymentOperation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "adminId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "amountCents" INTEGER,
    "previousStatus" TEXT,
    "nextStatus" TEXT,
    "providerStatus" TEXT,
    "providerResponse" JSONB,
    "reason" TEXT NOT NULL,
    "confirmation" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingFinancialEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "grossCents" INTEGER,
    "platformFeeCents" INTEGER,
    "hostNetCents" INTEGER,
    "refundCents" INTEGER,
    "payoutCents" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingFinancialEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOperation_idempotencyKey_key" ON "PaymentOperation"("idempotencyKey");
CREATE INDEX "PaymentOperation_paymentId_createdAt_idx" ON "PaymentOperation"("paymentId", "createdAt");
CREATE INDEX "PaymentOperation_type_status_createdAt_idx" ON "PaymentOperation"("type", "status", "createdAt");
CREATE INDEX "PaymentOperation_adminId_createdAt_idx" ON "PaymentOperation"("adminId", "createdAt");
CREATE INDEX "BookingFinancialEvent_bookingId_createdAt_idx" ON "BookingFinancialEvent"("bookingId", "createdAt");
CREATE INDEX "BookingFinancialEvent_paymentId_createdAt_idx" ON "BookingFinancialEvent"("paymentId", "createdAt");
CREATE INDEX "BookingFinancialEvent_type_status_createdAt_idx" ON "BookingFinancialEvent"("type", "status", "createdAt");

ALTER TABLE "PaymentOperation"
ADD CONSTRAINT "PaymentOperation_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingFinancialEvent"
ADD CONSTRAINT "BookingFinancialEvent_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
