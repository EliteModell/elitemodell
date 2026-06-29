ALTER TABLE "Professional"
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "placeId" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "smoker" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Professional_status_city_bairro_idx"
  ON "Professional"("status", "city", "bairro");

CREATE INDEX IF NOT EXISTS "Professional_kycStatus_idx"
  ON "Professional"("kycStatus");