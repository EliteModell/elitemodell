ALTER TABLE "Professional"
  ALTER COLUMN "accessGrandfathered" SET DEFAULT true;

UPDATE "Professional"
SET "accessGrandfathered" = true
WHERE "accessGrandfathered" = false
  AND "freeAccessStartedAt" IS NULL
  AND "freeAccessEndsAt" IS NULL;
