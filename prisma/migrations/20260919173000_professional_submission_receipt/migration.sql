CREATE TABLE IF NOT EXISTS "ProfessionalSubmissionReceipt" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfessionalSubmissionReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalSubmissionReceipt_professionalId_key"
  ON "ProfessionalSubmissionReceipt"("professionalId");

CREATE INDEX IF NOT EXISTS "ProfessionalSubmissionReceipt_status_updatedAt_idx"
  ON "ProfessionalSubmissionReceipt"("status", "updatedAt");

DO $$ BEGIN
  ALTER TABLE "ProfessionalSubmissionReceipt"
    ADD CONSTRAINT "ProfessionalSubmissionReceipt_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
