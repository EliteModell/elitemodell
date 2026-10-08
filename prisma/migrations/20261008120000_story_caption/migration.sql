ALTER TABLE "Story" ADD COLUMN "caption" VARCHAR(240);

ALTER TABLE "ProfessionalLocationChange"
  ADD COLUMN "requestIpHash" TEXT,
  ADD COLUMN "voucherId" TEXT;
