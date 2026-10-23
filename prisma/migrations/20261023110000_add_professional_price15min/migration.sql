-- The field has existed in Prisma since June 2026, but the repository never
-- shipped the matching migration. Keep this idempotent so environments that
-- were previously aligned with `prisma db push` remain safe.
ALTER TABLE public."Professional"
ADD COLUMN IF NOT EXISTS "price15min" DOUBLE PRECISION;
