ALTER TABLE "UploadAsset"
  ADD COLUMN IF NOT EXISTS "publicationDecisionType" TEXT NOT NULL DEFAULT 'UNDECIDED',
  ADD COLUMN IF NOT EXISTS "publicationPolicyVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "publicationDecisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicationEvidence" JSONB;

CREATE INDEX IF NOT EXISTS "UploadAsset_publicationDecisionType_createdAt_idx"
  ON "UploadAsset"("publicationDecisionType", "createdAt");
