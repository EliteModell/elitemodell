-- Additive gallery model. Existing ProfessionalPhoto and presentationVideoUrl
-- remain available during the compatibility period.
CREATE TABLE "ProfessionalMedia" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "assetId" TEXT,
    "legacyUrl" TEXT,
    "kind" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'GALLERY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalMedia_assetId_key" ON "ProfessionalMedia"("assetId");
CREATE INDEX "ProfessionalMedia_professionalId_hiddenAt_order_idx" ON "ProfessionalMedia"("professionalId", "hiddenAt", "order");
CREATE INDEX "ProfessionalMedia_kind_hiddenAt_idx" ON "ProfessionalMedia"("kind", "hiddenAt");

ALTER TABLE "ProfessionalMedia"
ADD CONSTRAINT "ProfessionalMedia_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalMedia"
ADD CONSTRAINT "ProfessionalMedia_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
