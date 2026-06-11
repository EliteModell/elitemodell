ALTER TABLE "PlatformSettings"
ADD COLUMN "uploadSecurityEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "uploadAvProvider" TEXT NOT NULL DEFAULT 'CLAMAV',
ADD COLUMN "uploadModerationProvider" TEXT NOT NULL DEFAULT 'MANUAL';

CREATE TABLE "UploadAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "declaredMimeType" TEXT,
    "detectedMimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "malwareStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "malwareProvider" TEXT,
    "malwareProviderVersion" TEXT,
    "malwareResult" JSONB,
    "moderationProvider" TEXT,
    "moderationProviderVersion" TEXT,
    "moderationResult" JSONB,
    "quarantineBucket" TEXT NOT NULL,
    "quarantinePath" TEXT NOT NULL,
    "approvedBucket" TEXT,
    "approvedPath" TEXT,
    "controlledUrl" TEXT,
    "failureReason" TEXT,
    "scanAttempts" INTEGER NOT NULL DEFAULT 0,
    "moderationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UploadAsset_userId_createdAt_idx" ON "UploadAsset"("userId", "createdAt");
CREATE INDEX "UploadAsset_status_createdAt_idx" ON "UploadAsset"("status", "createdAt");
CREATE INDEX "UploadAsset_malwareStatus_moderationStatus_createdAt_idx" ON "UploadAsset"("malwareStatus", "moderationStatus", "createdAt");
CREATE INDEX "UploadAsset_fileHash_idx" ON "UploadAsset"("fileHash");
CREATE UNIQUE INDEX "UploadAsset_quarantineBucket_quarantinePath_key" ON "UploadAsset"("quarantineBucket", "quarantinePath");

ALTER TABLE "UploadAsset"
ADD CONSTRAINT "UploadAsset_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UploadAsset"
ADD CONSTRAINT "UploadAsset_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
