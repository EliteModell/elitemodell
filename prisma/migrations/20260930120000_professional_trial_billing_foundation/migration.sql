CREATE TYPE "ProfessionalBillingStatus" AS ENUM (
  'PENDING_APPROVAL',
  'TRIAL',
  'ACTIVE',
  'TRIAL_EXPIRED',
  'PAST_DUE',
  'CANCELED',
  'GRANDFATHERED'
);

ALTER TABLE "Professional"
  ADD COLUMN "billingStatus" "ProfessionalBillingStatus" NOT NULL DEFAULT 'GRANDFATHERED',
  ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionProvider" TEXT,
  ADD COLUMN "subscriptionExternalId" TEXT;

UPDATE "Professional"
SET "billingStatus" = CASE
  WHEN "accessGrandfathered" = true THEN 'GRANDFATHERED'::"ProfessionalBillingStatus"
  WHEN "freeAccessStartedAt" IS NULL OR "freeAccessEndsAt" IS NULL THEN 'PENDING_APPROVAL'::"ProfessionalBillingStatus"
  WHEN "freeAccessEndsAt" > CURRENT_TIMESTAMP THEN 'TRIAL'::"ProfessionalBillingStatus"
  ELSE 'TRIAL_EXPIRED'::"ProfessionalBillingStatus"
END;

CREATE INDEX "Professional_billingStatus_freeAccessEndsAt_idx"
  ON "Professional"("billingStatus", "freeAccessEndsAt");

ALTER TABLE "PlatformSettings"
  ADD COLUMN "professionalBillingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "professionalMonthlyPriceCents" INTEGER,
  ADD COLUMN "professionalBillingCurrency" TEXT NOT NULL DEFAULT 'BRL';

ALTER TABLE "PlatformSettings"
  ADD CONSTRAINT "PlatformSettings_professionalMonthlyPriceCents_check"
  CHECK ("professionalMonthlyPriceCents" IS NULL OR "professionalMonthlyPriceCents" > 0);
