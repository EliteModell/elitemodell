ALTER TABLE "Professional"
ADD COLUMN "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';

CREATE INDEX "Professional_status_profileVisibility_featured_createdAt_idx"
ON "Professional"("status", "profileVisibility", "featured", "createdAt");
