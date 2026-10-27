CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED', 'REJECTED', 'FAILED');

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'RESEND',
  "providerMessageId" TEXT,
  "idempotencyKey" TEXT,
  "professionalId" TEXT,
  "recipientHash" TEXT NOT NULL,
  "recipientMasked" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "lastEvent" TEXT,
  "lastEventAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDelivery_providerMessageId_key" ON "EmailDelivery"("providerMessageId");
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX "EmailDelivery_professionalId_createdAt_idx" ON "EmailDelivery"("professionalId", "createdAt");
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");

ALTER TABLE "EmailDelivery" ENABLE ROW LEVEL SECURITY;
