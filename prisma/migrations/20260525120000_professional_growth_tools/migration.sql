ALTER TYPE "ProfessionalStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TABLE "Professional"
  ADD COLUMN IF NOT EXISTS "hidePhone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hideAge" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "presentationVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "presentationVideoStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "presentationVideoRejectReason" TEXT,
  ADD COLUMN IF NOT EXISTS "pauseStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pauseUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pauseReason" TEXT,
  ADD COLUMN IF NOT EXISTS "boostActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "boostStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "boostUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "boostSource" TEXT,
  ADD COLUMN IF NOT EXISTS "profileViews" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contactClicks" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProfessionalReview"
  ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'VISIBLE';

CREATE TABLE IF NOT EXISTS "ProfessionalProfileEvent" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalProfileEvent_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProfessionalProfileEvent_professionalId_fkey'
  ) THEN
    ALTER TABLE "ProfessionalProfileEvent"
      ADD CONSTRAINT "ProfessionalProfileEvent_professionalId_fkey"
      FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProfessionalReviewDispute" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfessionalReviewDispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalReviewDispute_reviewId_key"
  ON "ProfessionalReviewDispute"("reviewId");
CREATE INDEX IF NOT EXISTS "ProfessionalProfileEvent_professionalId_eventType_createdAt_idx"
  ON "ProfessionalProfileEvent"("professionalId", "eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "ProfessionalProfileEvent_createdAt_idx"
  ON "ProfessionalProfileEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ProfessionalReviewDispute_professionalId_status_createdAt_idx"
  ON "ProfessionalReviewDispute"("professionalId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProfessionalReviewDispute_status_createdAt_idx"
  ON "ProfessionalReviewDispute"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Professional_status_boostActive_boostUntil_idx"
  ON "Professional"("status", "boostActive", "boostUntil");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProfessionalReviewDispute_reviewId_fkey'
  ) THEN
    ALTER TABLE "ProfessionalReviewDispute"
      ADD CONSTRAINT "ProfessionalReviewDispute_reviewId_fkey"
      FOREIGN KEY ("reviewId") REFERENCES "ProfessionalReview"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProfessionalReviewDispute_professionalId_fkey'
  ) THEN
    ALTER TABLE "ProfessionalReviewDispute"
      ADD CONSTRAINT "ProfessionalReviewDispute_professionalId_fkey"
      FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProfessionalReviewDispute_authorId_fkey'
  ) THEN
    ALTER TABLE "ProfessionalReviewDispute"
      ADD CONSTRAINT "ProfessionalReviewDispute_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
