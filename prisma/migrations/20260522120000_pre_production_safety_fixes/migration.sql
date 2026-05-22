-- Pre-production safety fixes:
-- - official client city/state and premium status
-- - Asaas payment tracking
-- - professional favorites

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3);

ALTER TABLE "Payment"
  ALTER COLUMN "bookingId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'asaas',
  ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalReference" TEXT,
  ADD COLUMN IF NOT EXISTS "pixQrCodeBase64" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "creditAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_externalReference_key" ON "Payment"("externalReference");
CREATE INDEX IF NOT EXISTS "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_idx" ON "Payment"("provider", "providerPaymentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_userId_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Favorite"
  ALTER COLUMN "propertyId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "professionalId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_professionalId_key" ON "Favorite"("userId", "professionalId");
CREATE INDEX IF NOT EXISTS "Favorite_professionalId_idx" ON "Favorite"("professionalId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_professionalId_fkey'
  ) THEN
    ALTER TABLE "Favorite"
      ADD CONSTRAINT "Favorite_professionalId_fkey"
      FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
