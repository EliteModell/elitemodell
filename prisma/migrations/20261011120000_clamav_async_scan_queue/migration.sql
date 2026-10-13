CREATE TABLE "MalwareScanJob" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "taskName" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDispatchError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MalwareScanJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MalwareScanJob_assetId_key" ON "MalwareScanJob"("assetId");
CREATE UNIQUE INDEX "MalwareScanJob_taskName_key" ON "MalwareScanJob"("taskName");
CREATE INDEX "MalwareScanJob_status_availableAt_idx" ON "MalwareScanJob"("status", "availableAt");
CREATE INDEX "MalwareScanJob_leaseExpiresAt_idx" ON "MalwareScanJob"("leaseExpiresAt");

ALTER TABLE "MalwareScanJob"
ADD CONSTRAINT "MalwareScanJob_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
