ALTER TABLE "Professional"
ADD COLUMN "servicesNotOffered" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "serviceCities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "approximateLocation" TEXT,
ADD COLUMN "activePlanId" TEXT,
ADD COLUMN "planPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "onlineVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastOnlineAt" TIMESTAMP(3);

CREATE INDEX "Professional_status_planPriority_featured_rating_idx"
ON "Professional"("status", "planPriority", "featured", "rating");

CREATE INDEX "Professional_status_lastOnlineAt_idx"
ON "Professional"("status", "lastOnlineAt");

WITH latest_active_plan AS (
  SELECT DISTINCT ON ("userId")
    "userId",
    split_part("externalReference", ':', 2) AS plan_id
  FROM "Payment"
  WHERE "userId" IS NOT NULL
    AND "status" = 'PAID'
    AND "premiumUntil" > CURRENT_TIMESTAMP
    AND "externalReference" LIKE 'professional-plan:%'
  ORDER BY "userId", "paidAt" DESC NULLS LAST, "createdAt" DESC
)
UPDATE "Professional" AS professional
SET
  "activePlanId" = latest.plan_id,
  "planPriority" = CASE latest.plan_id
    WHEN 'one-hour-top' THEN 700
    WHEN 'diamante' THEN 600
    WHEN 'ouro' THEN 500
    WHEN 'prata' THEN 400
    WHEN 'bronze' THEN 300
    WHEN 'pontos' THEN 200
    WHEN 'telefone' THEN 100
    WHEN 'idade-oculta' THEN 100
    ELSE 0
  END
FROM latest_active_plan AS latest
WHERE professional."userId" = latest."userId";
