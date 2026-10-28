CREATE TABLE "VideoProcessingJob" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 4,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "sourceBucket" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "sourceSizeBytes" INTEGER NOT NULL,
  "outputBucket" TEXT,
  "outputPath" TEXT,
  "outputSizeBytes" INTEGER,
  "outputHash" TEXT,
  "outputWidth" INTEGER,
  "outputHeight" INTEGER,
  "outputDurationMs" INTEGER,
  "outputCodec" TEXT,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "sourceDeleteAfter" TIMESTAMP(3),
  "sourceDeletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoProcessingJob_assetId_key" ON "VideoProcessingJob"("assetId");
CREATE INDEX "VideoProcessingJob_status_availableAt_idx" ON "VideoProcessingJob"("status", "availableAt");
CREATE INDEX "VideoProcessingJob_leaseExpiresAt_idx" ON "VideoProcessingJob"("leaseExpiresAt");
CREATE INDEX "VideoProcessingJob_sourceDeleteAfter_sourceDeletedAt_idx" ON "VideoProcessingJob"("sourceDeleteAfter", "sourceDeletedAt");

ALTER TABLE "VideoProcessingJob"
  ADD CONSTRAINT "VideoProcessingJob_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
