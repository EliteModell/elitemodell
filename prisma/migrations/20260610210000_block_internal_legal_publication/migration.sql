CREATE OR REPLACE FUNCTION prevent_internal_legal_document_publication()
RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'PUBLISHED'
     AND EXISTS (
       SELECT 1
       FROM "LegalDocument"
       WHERE "id" = NEW."documentId"
         AND "internal" = true
     ) THEN
    RAISE EXCEPTION 'Internal legal documents cannot be published';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LegalDocumentVersion_internal_not_publishable"
BEFORE INSERT OR UPDATE OF "status", "documentId" ON "LegalDocumentVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_internal_legal_document_publication();
