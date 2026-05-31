ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "originalPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "voucherDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "finalPrice" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "VoucherSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "dailySpinLimit" INTEGER NOT NULL DEFAULT 1,
  "guestDailySpinLimit" INTEGER NOT NULL DEFAULT 1,
  "pendingClaimMinutes" INTEGER NOT NULL DEFAULT 30,
  "defaultExpiresInDays" INTEGER NOT NULL DEFAULT 15,
  "allowMultipleVouchersPerAppointment" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoucherSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VoucherPrize" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "probability" DOUBLE PRECISION NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
  "paymentAmount" DOUBLE PRECISION,
  "expiresInDays" INTEGER NOT NULL DEFAULT 15,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoucherPrize_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VoucherSpin" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "visitorId" TEXT,
  "prizeId" TEXT,
  "result" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "pendingToken" TEXT,
  "pendingExpiresAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "recipientName" TEXT,
  "recipientPhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoucherSpin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientVoucher" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "visitorId" TEXT,
  "prizeId" TEXT,
  "spinId" TEXT,
  "code" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "appointmentId" TEXT,
  "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
  "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "paymentId" TEXT,
  "recipientName" TEXT,
  "recipientPhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientVoucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProfessionalVoucherSettings" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "acceptsVouchers" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfessionalVoucherSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VoucherSpin_idempotencyKey_key" ON "VoucherSpin"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "VoucherSpin_pendingToken_key" ON "VoucherSpin"("pendingToken");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientVoucher_code_key" ON "ClientVoucher"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientVoucher_appointmentId_key" ON "ClientVoucher"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalVoucherSettings_professionalId_key" ON "ProfessionalVoucherSettings"("professionalId");

CREATE INDEX IF NOT EXISTS "VoucherPrize_active_sortOrder_idx" ON "VoucherPrize"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "VoucherSpin_clientId_createdAt_idx" ON "VoucherSpin"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoucherSpin_visitorId_createdAt_idx" ON "VoucherSpin"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoucherSpin_ipAddress_createdAt_idx" ON "VoucherSpin"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "VoucherSpin_result_createdAt_idx" ON "VoucherSpin"("result", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientVoucher_clientId_status_expiresAt_idx" ON "ClientVoucher"("clientId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "ClientVoucher_visitorId_status_expiresAt_idx" ON "ClientVoucher"("visitorId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "ClientVoucher_recipientPhone_status_idx" ON "ClientVoucher"("recipientPhone", "status");
CREATE INDEX IF NOT EXISTS "ClientVoucher_paymentStatus_idx" ON "ClientVoucher"("paymentStatus");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VoucherSpin_clientId_fkey') THEN
    ALTER TABLE "VoucherSpin" ADD CONSTRAINT "VoucherSpin_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VoucherSpin_prizeId_fkey') THEN
    ALTER TABLE "VoucherSpin" ADD CONSTRAINT "VoucherSpin_prizeId_fkey"
      FOREIGN KEY ("prizeId") REFERENCES "VoucherPrize"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVoucher_clientId_fkey') THEN
    ALTER TABLE "ClientVoucher" ADD CONSTRAINT "ClientVoucher_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVoucher_prizeId_fkey') THEN
    ALTER TABLE "ClientVoucher" ADD CONSTRAINT "ClientVoucher_prizeId_fkey"
      FOREIGN KEY ("prizeId") REFERENCES "VoucherPrize"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVoucher_spinId_fkey') THEN
    ALTER TABLE "ClientVoucher" ADD CONSTRAINT "ClientVoucher_spinId_fkey"
      FOREIGN KEY ("spinId") REFERENCES "VoucherSpin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVoucher_appointmentId_fkey') THEN
    ALTER TABLE "ClientVoucher" ADD CONSTRAINT "ClientVoucher_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVoucher_paymentId_fkey') THEN
    ALTER TABLE "ClientVoucher" ADD CONSTRAINT "ClientVoucher_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProfessionalVoucherSettings_professionalId_fkey') THEN
    ALTER TABLE "ProfessionalVoucherSettings" ADD CONSTRAINT "ProfessionalVoucherSettings_professionalId_fkey"
      FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
