CREATE TABLE "LegacyMediaMigrationJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "mode" TEXT NOT NULL DEFAULT 'STAGE',
    "manifestHash" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvalReason" TEXT,
    "rollbackManifest" JSONB,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyMediaMigrationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegacyMediaMigrationItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "ownerId" TEXT,
    "sourceBucket" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceVisibility" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "targetAssetId" TEXT,
    "fileHash" TEXT,
    "snapshot" JSONB,
    "error" TEXT,
    "stagedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyMediaMigrationItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegacyMediaMigrationJob_manifestHash_key" ON "LegacyMediaMigrationJob"("manifestHash");
CREATE INDEX "LegacyMediaMigrationJob_status_createdAt_idx" ON "LegacyMediaMigrationJob"("status", "createdAt");
CREATE UNIQUE INDEX "LegacyMediaMigrationItem_jobId_referenceType_referenceId_field_sourcePath_key"
ON "LegacyMediaMigrationItem"("jobId", "referenceType", "referenceId", "field", "sourcePath");
CREATE INDEX "LegacyMediaMigrationItem_jobId_status_idx" ON "LegacyMediaMigrationItem"("jobId", "status");
CREATE INDEX "LegacyMediaMigrationItem_targetAssetId_idx" ON "LegacyMediaMigrationItem"("targetAssetId");
CREATE INDEX "LegacyMediaMigrationItem_sourceBucket_sourcePath_idx" ON "LegacyMediaMigrationItem"("sourceBucket", "sourcePath");

ALTER TABLE "LegacyMediaMigrationItem"
ADD CONSTRAINT "LegacyMediaMigrationItem_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "LegacyMediaMigrationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
