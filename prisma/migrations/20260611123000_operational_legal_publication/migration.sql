ALTER TABLE "LegalDocumentVersion"
ADD COLUMN "operationalPublisherName" TEXT,
ADD COLUMN "legalRepresentativeName" TEXT,
ADD COLUMN "applicableChannel" TEXT,
ADD COLUMN "operationalPublicationNote" TEXT;

ALTER TABLE "UserAcceptance"
ADD COLUMN "acceptanceType" TEXT NOT NULL DEFAULT 'DOCUMENT',
ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CheckoutAcceptance"
ADD COLUMN "route" TEXT,
ADD COLUMN "language" TEXT NOT NULL DEFAULT 'pt-BR',
ADD COLUMN "acceptanceType" TEXT NOT NULL DEFAULT 'CHECKOUT',
ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION prevent_internal_legal_document_publication()
RETURNS trigger AS $$
BEGIN
  IF NEW."status" IN ('PUBLISHED', 'OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION')
     AND EXISTS (
       SELECT 1
       FROM "LegalDocument"
       WHERE "id" = NEW."documentId"
         AND "internal" = true
     ) THEN
    RAISE EXCEPTION 'Internal legal documents cannot receive a public status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX "LegalDocumentVersion_operational_publication_idx"
ON "LegalDocumentVersion"("status", "publishedAt", "effectiveAt");

CREATE OR REPLACE FUNCTION prevent_accepted_legal_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "UserAcceptance" WHERE "versionId" = OLD."id")
     OR OLD."status" IN (
       'PUBLISHED',
       'OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION',
       'ARCHIVED'
     ) THEN
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

DROP TRIGGER IF EXISTS "LegalDocumentVersion_immutable" ON "LegalDocumentVersion";
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
     OR NEW."action" IS DISTINCT FROM OLD."action"
     OR NEW."acceptanceType" IS DISTINCT FROM OLD."acceptanceType"
     OR NEW."required" IS DISTINCT FROM OLD."required" THEN
    RAISE EXCEPTION 'User acceptances are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "UserAcceptance_immutable" ON "UserAcceptance";
CREATE TRIGGER "UserAcceptance_immutable"
BEFORE UPDATE ON "UserAcceptance"
FOR EACH ROW EXECUTE FUNCTION prevent_acceptance_mutation();
