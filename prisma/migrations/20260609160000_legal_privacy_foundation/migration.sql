-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "changeSummary" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pendingFields" JSONB,
    "requiresNewAcceptance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "approverId" TEXT,
    "legalReviewerName" TEXT,
    "legalReviewNote" TEXT,
    "legalReviewReference" TEXT,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "userCategory" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "versionHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "source" TEXT NOT NULL,
    "route" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "action" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "legalBasis" TEXT,
    "version" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "details" TEXT,
    "preservation" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "receiptHash" TEXT,
    "assignedToId" TEXT,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDeclaration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "declarationKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "statements" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ContentDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "dailyPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expectedEndsAt" TIMESTAMP(3),
    "termsVersionId" TEXT,
    "refundPolicyVersionId" TEXT,
    "termsHash" TEXT,
    "refundPolicyHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "reporterId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "restrictedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceArtifact" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalSource" TEXT,
    "preservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "action" TEXT,
    "retentionDays" INTEGER,
    "legalBasis" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "privacyRequestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scope" JSONB NOT NULL,
    "preservation" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorSummary" TEXT,
    "receiptHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "systemsAffected" JSONB NOT NULL,
    "dataCategories" JSONB NOT NULL,
    "affectedSubjects" INTEGER,
    "riskAssessment" TEXT,
    "relevantHarm" BOOLEAN,
    "containment" TEXT,
    "investigation" TEXT,
    "correctiveMeasures" TEXT,
    "notificationDueAt" TIMESTAMP(3),
    "anpdNotifiedAt" TIMESTAMP(3),
    "subjectsNotifiedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_key_key" ON "LegalDocument"("key");

-- CreateIndex
CREATE INDEX "LegalDocument_type_audience_idx" ON "LegalDocument"("type", "audience");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentId_status_idx" ON "LegalDocumentVersion"("documentId", "status");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_status_effectiveAt_idx" ON "LegalDocumentVersion"("status", "effectiveAt");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_contentHash_idx" ON "LegalDocumentVersion"("contentHash");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_createdAt_idx" ON "LegalDocumentVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_language_version_key" ON "LegalDocumentVersion"("documentId", "language", "version");

-- CreateIndex
CREATE INDEX "UserAcceptance_userId_acceptedAt_idx" ON "UserAcceptance"("userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "UserAcceptance_versionId_acceptedAt_idx" ON "UserAcceptance"("versionId", "acceptedAt");

-- CreateIndex
CREATE INDEX "UserAcceptance_documentType_acceptedAt_idx" ON "UserAcceptance"("documentType", "acceptedAt");

-- CreateIndex
CREATE INDEX "UserAcceptance_revokedAt_idx" ON "UserAcceptance"("revokedAt");

-- CreateIndex
CREATE INDEX "ConsentPreference_userId_purpose_updatedAt_idx" ON "ConsentPreference"("userId", "purpose", "updatedAt");

-- CreateIndex
CREATE INDEX "ConsentPreference_purpose_granted_idx" ON "ConsentPreference"("purpose", "granted");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRequest_protocol_key" ON "PrivacyRequest"("protocol");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_requestedAt_idx" ON "PrivacyRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_requestedAt_idx" ON "PrivacyRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_dueAt_idx" ON "PrivacyRequest"("dueAt");

-- CreateIndex
CREATE INDEX "PrivacyRequestEvent_requestId_createdAt_idx" ON "PrivacyRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDeclaration_userId_createdAt_idx" ON "ContentDeclaration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDeclaration_fileHash_idx" ON "ContentDeclaration"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDeclaration_storageBucket_storagePath_declarationKey_key" ON "ContentDeclaration"("storageBucket", "storagePath", "declarationKey", "version");

-- CreateIndex
CREATE INDEX "CheckoutAcceptance_userId_acceptedAt_idx" ON "CheckoutAcceptance"("userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "CheckoutAcceptance_paymentId_idx" ON "CheckoutAcceptance"("paymentId");

-- CreateIndex
CREATE INDEX "CheckoutAcceptance_productId_acceptedAt_idx" ON "CheckoutAcceptance"("productId", "acceptedAt");

-- CreateIndex
CREATE INDEX "CheckoutAcceptance_status_idx" ON "CheckoutAcceptance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationCase_protocol_key" ON "ModerationCase"("protocol");

-- CreateIndex
CREATE INDEX "ModerationCase_status_priority_createdAt_idx" ON "ModerationCase"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationCase_targetType_targetId_idx" ON "ModerationCase"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationCase_reporterId_createdAt_idx" ON "ModerationCase"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationCase_slaDueAt_idx" ON "ModerationCase"("slaDueAt");

-- CreateIndex
CREATE INDEX "ModerationCaseEvent_caseId_createdAt_idx" ON "ModerationCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_caseId_preservedAt_idx" ON "EvidenceArtifact"("caseId", "preservedAt");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_fileHash_idx" ON "EvidenceArtifact"("fileHash");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_expiresAt_legalHold_idx" ON "EvidenceArtifact"("expiresAt", "legalHold");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionRule_category_key" ON "DataRetentionRule"("category");

-- CreateIndex
CREATE INDEX "DataRetentionRule_status_idx" ON "DataRetentionRule"("status");

-- CreateIndex
CREATE INDEX "DataDeletionJob_userId_createdAt_idx" ON "DataDeletionJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DataDeletionJob_status_nextAttemptAt_idx" ON "DataDeletionJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIncident_protocol_key" ON "SecurityIncident"("protocol");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_discoveredAt_idx" ON "SecurityIncident"("status", "discoveredAt");

-- CreateIndex
CREATE INDEX "SecurityIncident_notificationDueAt_idx" ON "SecurityIncident"("notificationDueAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationCode_expiresAt_createdAt_idx" ON "PhoneVerificationCode"("expiresAt", "createdAt");

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAcceptance" ADD CONSTRAINT "UserAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAcceptance" ADD CONSTRAINT "UserAcceptance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentPreference" ADD CONSTRAINT "ConsentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequestEvent" ADD CONSTRAINT "PrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeclaration" ADD CONSTRAINT "ContentDeclaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAcceptance" ADD CONSTRAINT "CheckoutAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAcceptance" ADD CONSTRAINT "CheckoutAcceptance_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAcceptance" ADD CONSTRAINT "CheckoutAcceptance_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAcceptance" ADD CONSTRAINT "CheckoutAcceptance_refundPolicyVersionId_fkey" FOREIGN KEY ("refundPolicyVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCaseEvent" ADD CONSTRAINT "ModerationCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceArtifact" ADD CONSTRAINT "EvidenceArtifact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDeletionJob" ADD CONSTRAINT "DataDeletionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_accepted_legal_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "UserAcceptance" WHERE "versionId" = OLD."id")
     OR OLD."status" IN ('PUBLISHED', 'ARCHIVED') THEN
    IF NEW."content" IS DISTINCT FROM OLD."content"
       OR NEW."contentHash" IS DISTINCT FROM OLD."contentHash"
       OR NEW."version" IS DISTINCT FROM OLD."version"
       OR NEW."documentId" IS DISTINCT FROM OLD."documentId"
       OR NEW."language" IS DISTINCT FROM OLD."language" THEN
      RAISE EXCEPTION 'Accepted or published legal versions are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LegalDocumentVersion_immutable"
BEFORE UPDATE ON "LegalDocumentVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_accepted_legal_version_mutation();

CREATE OR REPLACE FUNCTION prevent_acceptance_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."versionId" IS DISTINCT FROM OLD."versionId"
     OR NEW."versionHash" IS DISTINCT FROM OLD."versionHash"
     OR NEW."acceptedAt" IS DISTINCT FROM OLD."acceptedAt"
     OR NEW."ipAddress" IS DISTINCT FROM OLD."ipAddress"
     OR NEW."userAgent" IS DISTINCT FROM OLD."userAgent"
     OR NEW."sessionId" IS DISTINCT FROM OLD."sessionId"
     OR NEW."source" IS DISTINCT FROM OLD."source"
     OR NEW."route" IS DISTINCT FROM OLD."route"
     OR NEW."action" IS DISTINCT FROM OLD."action" THEN
    RAISE EXCEPTION 'User acceptances are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UserAcceptance_immutable"
BEFORE UPDATE ON "UserAcceptance"
FOR EACH ROW EXECUTE FUNCTION prevent_acceptance_mutation();

INSERT INTO "DataRetentionRule" ("id", "category", "status", "createdAt", "updatedAt")
VALUES
  ('ret_account', 'ACCOUNT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_auth', 'AUTHENTICATION', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_documents', 'DOCUMENTS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_biometrics', 'BIOMETRICS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_public_media', 'PUBLIC_MEDIA', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_stories', 'STORIES', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_payments', 'PAYMENTS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_bookings', 'BOOKINGS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_messages', 'MESSAGES', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_reports', 'REPORTS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_evidence', 'EVIDENCE', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_audit', 'AUDIT', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_webhooks', 'WEBHOOKS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_logs', 'TECHNICAL_LOGS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_marketing', 'MARKETING', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_cookies', 'COOKIES', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ret_privacy', 'PRIVACY_REQUESTS', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RenameIndex
ALTER INDEX "ClientVoucher_prize_status_createdAt_idx" RENAME TO "ClientVoucher_prizeId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "VoucherSpin_client_result_createdAt_idx" RENAME TO "VoucherSpin_clientId_result_createdAt_idx";

-- RenameIndex
ALTER INDEX "VoucherSpin_ip_result_createdAt_idx" RENAME TO "VoucherSpin_ipAddress_result_createdAt_idx";

-- RenameIndex
ALTER INDEX "VoucherSpin_visitor_result_createdAt_idx" RENAME TO "VoucherSpin_visitorId_result_createdAt_idx";
