ALTER TABLE "Professional"
  ADD COLUMN IF NOT EXISTS "freeAccessStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "freeAccessEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "accessGrandfathered" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Professional"
SET "accessGrandfathered" = true
WHERE "accessGrandfathered" = false;

CREATE INDEX IF NOT EXISTS "Professional_status_accessGrandfathered_freeAccessEndsAt_idx"
  ON "Professional"("status", "accessGrandfathered", "freeAccessEndsAt");

CREATE TABLE IF NOT EXISTS "PlatformSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "professionalFreeTrialDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" (
  "id",
  "professionalFreeTrialDays",
  "createdAt",
  "updatedAt"
)
VALUES ('default', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
