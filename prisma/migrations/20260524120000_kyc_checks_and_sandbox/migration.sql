-- Migration: Add kycIsSandbox and kycChecksJson to User
-- Purpose: Store individual Persona check results and sandbox flag to prevent
--          auto-approval of sandbox/simulated KYC data.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycIsSandbox" BOOLEAN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycChecksJson" JSONB;
