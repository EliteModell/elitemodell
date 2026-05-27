ALTER TABLE "Professional"
  ADD COLUMN IF NOT EXISTS "listingPhoneUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Professional_status_listingPhoneUntil_idx"
  ON "Professional"("status", "listingPhoneUntil");
