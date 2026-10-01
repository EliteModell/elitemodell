-- Measured on an isolated 50k-professional dataset before inclusion:
-- city/ranking page 22.440 ms -> 0.165 ms; text page 38.172 ms -> 0.991 ms.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Professional_currentServiceCity_trgm_idx"
  ON "Professional" USING gin ("currentServiceCity" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Professional_currentServiceState_trgm_idx"
  ON "Professional" USING gin ("currentServiceState" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Professional_displayName_trgm_idx"
  ON "Professional" USING gin ("displayName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Professional_bio_trgm_idx"
  ON "Professional" USING gin (bio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Professional_public_rank_idx"
  ON "Professional" (status, "boostActive" DESC, "planPriority" DESC, featured DESC, rating DESC, "totalReviews" DESC);

-- Prisma includes specialties as a relation in public search results. Without
-- this FK index, every relation load scans the complete specialty table.
CREATE INDEX IF NOT EXISTS "ProfessionalSpecialty_professionalId_idx"
  ON "ProfessionalSpecialty" ("professionalId");

-- Database-enforced identity guards close the check-then-write race during
-- concurrent OTP/register retries. Existing production data was checked first:
-- zero duplicate normalized verified-phone/document groups on 2026-10-01.
CREATE UNIQUE INDEX IF NOT EXISTS "User_verified_phone_unique_idx"
  ON "User" ((regexp_replace(phone, '[^0-9]', '', 'g')))
  WHERE phone IS NOT NULL AND "phoneVerified" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "User_document_unique_idx"
  ON "User" ((upper(regexp_replace(document, '[^0-9A-Za-z]', '', 'g'))))
  WHERE document IS NOT NULL AND btrim(document) <> '';
