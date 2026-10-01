ALTER TABLE "UploadAsset"
  ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
  ADD COLUMN "uploadCompletedAt" TIMESTAMP(3),
  ADD COLUMN "contentRating" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "ageIdentityStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "adminReviewRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "adminReviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "takedownStatus" TEXT NOT NULL DEFAULT 'CLEAR',
  ADD COLUMN "takedownAt" TIMESTAMP(3),
  ADD COLUMN "takedownReason" TEXT,
  ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'CONTROLLED_ROUTE';

ALTER TABLE "ProfessionalPhoto"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" TEXT;

CREATE TABLE "MediaDepictedPerson" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "personReference" TEXT NOT NULL,
  "relationship" TEXT NOT NULL DEFAULT 'DEPICTED_PERSON',
  "isUploader" BOOLEAN NOT NULL DEFAULT false,
  "isContentOwner" BOOLEAN NOT NULL DEFAULT false,
  "ageVerificationReference" TEXT,
  "consentReference" TEXT,
  "verificationDate" TIMESTAMP(3),
  "ageStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaDepictedPerson_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MediaDepictedPerson"
  ADD CONSTRAINT "MediaDepictedPerson_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MediaDepictedPerson_assetId_personReference_key"
  ON "MediaDepictedPerson"("assetId", "personReference");
CREATE INDEX "MediaDepictedPerson_assetId_ageStatus_consentStatus_idx"
  ON "MediaDepictedPerson"("assetId", "ageStatus", "consentStatus");
CREATE INDEX "MediaDepictedPerson_personReference_idx"
  ON "MediaDepictedPerson"("personReference");
CREATE INDEX "UploadAsset_takedownStatus_status_createdAt_idx"
  ON "UploadAsset"("takedownStatus", "status", "createdAt");
CREATE INDEX "UploadAsset_storageProvider_approvedBucket_approvedPath_idx"
  ON "UploadAsset"("storageProvider", "approvedBucket", "approvedPath");
CREATE INDEX "ProfessionalPhoto_hiddenAt_idx" ON "ProfessionalPhoto"("hiddenAt");

UPDATE "UploadAsset" SET "uploadCompletedAt" = "createdAt" WHERE "uploadCompletedAt" IS NULL;

UPDATE "UploadAsset" AS asset
SET "ageIdentityStatus" = CASE
      WHEN EXISTS (
        SELECT 1 FROM "User" owner
        WHERE owner."id" = asset."userId"
          AND owner."birthDate" IS NOT NULL
          AND owner."birthDate" <= CURRENT_TIMESTAMP - INTERVAL '18 years'
      ) THEN 'PASS'
      ELSE 'PENDING'
    END,
    "consentStatus" = CASE
      WHEN EXISTS (
        SELECT 1 FROM "ContentDeclaration" declaration
        WHERE declaration."userId" = asset."userId"
          AND declaration."fileHash" = asset."fileHash"
          AND declaration."revokedAt" IS NULL
      ) THEN 'PASS'
      ELSE 'PENDING'
    END,
    "adminReviewStatus" = CASE WHEN asset."reviewedById" IS NOT NULL THEN 'PASS' ELSE 'PENDING' END;

UPDATE "UploadAsset"
SET "status" = 'QUARANTINED',
    "approvedAt" = NULL,
    "failureReason" = 'Fail-closed: ativo existente aguardando gates obrigatorios de seguranca.'
WHERE "status" = 'APPROVED'
  AND (
    "malwareStatus" NOT IN ('CLEAN', 'APPROVED')
    OR "moderationStatus" <> 'APPROVED'
    OR "ageIdentityStatus" <> 'PASS'
    OR "consentStatus" <> 'PASS'
    OR "adminReviewStatus" <> 'PASS'
  );

INSERT INTO "DataRetentionRule" ("id", "category", "status", "createdAt", "updatedAt") VALUES
  ('retention-kyc-v2', 'KYC', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-identity-document-v2', 'IDENTITY_DOCUMENT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-biometric-reference-v2', 'BIOMETRIC_REFERENCE', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-private-media-v2', 'PRIVATE_MEDIA', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-quarantine-v2', 'QUARANTINE', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-message-v2', 'MESSAGE', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-payment-v2', 'PAYMENT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-audit-log-v2', 'AUDIT_LOG', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-abuse-report-v2', 'ABUSE_REPORT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-webhook-v2', 'WEBHOOK', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-account-v2', 'ACCOUNT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-auth-v2', 'AUTH', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('retention-public-media-v2', 'PUBLIC_MEDIA', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("category") DO NOTHING;
