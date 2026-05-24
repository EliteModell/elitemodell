CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT,
  "resourceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_resourceId_idx" ON "WebhookEvent"("provider", "resourceId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");
