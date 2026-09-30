-- Additive registration and service-location state. Existing rows remain valid legacy records.
ALTER TABLE "Professional"
  ADD COLUMN IF NOT EXISTS "registrationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completionRulesVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "currentServiceCity" TEXT,
  ADD COLUMN IF NOT EXISTS "currentServiceState" TEXT,
  ADD COLUMN IF NOT EXISTS "currentServiceNeighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalServiceNeighborhoods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "locationVerificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "temporaryLocationFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "temporaryLocationUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "previousServiceLocation" JSONB;

CREATE TABLE IF NOT EXISTS "ProfessionalLocationChange" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "fromCity" TEXT,
  "fromState" TEXT,
  "fromNeighborhood" TEXT,
  "toCity" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "toNeighborhood" TEXT,
  "changeType" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
  "riskReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalLocationChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProfessionalLocationChange_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProfessionalLocationChange_professionalId_createdAt_idx"
  ON "ProfessionalLocationChange"("professionalId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProfessionalLocationChange_verificationStatus_createdAt_idx"
  ON "ProfessionalLocationChange"("verificationStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "Professional_currentServiceState_currentServiceCity_idx"
  ON "Professional"("currentServiceState", "currentServiceCity");
