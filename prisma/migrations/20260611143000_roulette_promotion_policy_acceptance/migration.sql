ALTER TABLE "VoucherSettings"
ADD COLUMN "promotionAuthorizationReference" TEXT;

ALTER TABLE "VoucherSpin"
ADD COLUMN "legalPolicyKey" TEXT,
ADD COLUMN "legalPolicyVersion" TEXT,
ADD COLUMN "legalPolicyHash" TEXT,
ADD COLUMN "legalPolicyAcceptedAt" TIMESTAMP(3);

CREATE INDEX "VoucherSpin_legalPolicyHash_createdAt_idx"
ON "VoucherSpin"("legalPolicyHash", "createdAt");
