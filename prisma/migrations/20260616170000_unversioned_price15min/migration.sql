-- Reconstructs the schema change introduced by commit
-- 06198656981a2c4a308a23b19179a058ce05ce78 before later migrations.
ALTER TABLE "Professional" ADD COLUMN "price15min" DOUBLE PRECISION;
