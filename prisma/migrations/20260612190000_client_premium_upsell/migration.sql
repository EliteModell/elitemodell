ALTER TABLE "Professional"
ADD COLUMN "contactVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';

UPDATE "Professional"
SET "contactVisibility" = CASE
  WHEN "hidePhone" = TRUE THEN 'PREMIUM'
  ELSE 'PUBLIC'
END;

ALTER TABLE "Professional"
ADD CONSTRAINT "Professional_contactVisibility_check"
CHECK ("contactVisibility" IN ('PUBLIC', 'LOGGED_IN', 'PREMIUM'));

CREATE TABLE "PremiumPurchaseIntent" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
  "claimTokenHash" TEXT NOT NULL,
  "purchaserName" TEXT NOT NULL,
  "purchaserEmail" TEXT NOT NULL,
  "purchaserPhone" TEXT,
  "purchaserDocumentHash" TEXT NOT NULL,
  "purchaserDocumentLast4" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "termsVersionId" TEXT,
  "refundPolicyVersionId" TEXT,
  "termsHash" TEXT NOT NULL,
  "refundPolicyHash" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PremiumPurchaseIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumPurchaseEvent" (
  "id" TEXT NOT NULL,
  "intentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PremiumPurchaseEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PremiumPurchaseIntent_paymentId_key"
ON "PremiumPurchaseIntent"("paymentId");

CREATE UNIQUE INDEX "PremiumPurchaseIntent_claimTokenHash_key"
ON "PremiumPurchaseIntent"("claimTokenHash");

CREATE INDEX "PremiumPurchaseIntent_purchaserEmail_status_createdAt_idx"
ON "PremiumPurchaseIntent"("purchaserEmail", "status", "createdAt");

CREATE INDEX "PremiumPurchaseIntent_claimedByUserId_status_idx"
ON "PremiumPurchaseIntent"("claimedByUserId", "status");

CREATE INDEX "PremiumPurchaseIntent_status_createdAt_idx"
ON "PremiumPurchaseIntent"("status", "createdAt");

CREATE INDEX "PremiumPurchaseEvent_intentId_createdAt_idx"
ON "PremiumPurchaseEvent"("intentId", "createdAt");

CREATE INDEX "PremiumPurchaseEvent_type_createdAt_idx"
ON "PremiumPurchaseEvent"("type", "createdAt");

ALTER TABLE "PremiumPurchaseIntent"
ADD CONSTRAINT "PremiumPurchaseIntent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PremiumPurchaseIntent"
ADD CONSTRAINT "PremiumPurchaseIntent_claimedByUserId_fkey"
FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PremiumPurchaseEvent"
ADD CONSTRAINT "PremiumPurchaseEvent_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "PremiumPurchaseIntent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
