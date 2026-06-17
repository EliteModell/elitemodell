ALTER TABLE "DataDeletionJob"
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'EXECUTE',
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "legalHoldReason" TEXT;

CREATE TABLE "DataDeletionJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionJobItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataDeletionJobItem_jobId_itemKey_key" ON "DataDeletionJobItem"("jobId", "itemKey");
CREATE INDEX "DataDeletionJobItem_status_nextAttemptAt_idx" ON "DataDeletionJobItem"("status", "nextAttemptAt");
CREATE INDEX "DataDeletionJobItem_jobId_status_idx" ON "DataDeletionJobItem"("jobId", "status");

ALTER TABLE "DataDeletionJobItem"
ADD CONSTRAINT "DataDeletionJobItem_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DataDeletionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
