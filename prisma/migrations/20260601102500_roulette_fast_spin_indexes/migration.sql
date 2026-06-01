CREATE INDEX IF NOT EXISTS "VoucherSpin_client_result_createdAt_idx"
  ON "VoucherSpin" ("clientId", "result", "createdAt");

CREATE INDEX IF NOT EXISTS "VoucherSpin_visitor_result_createdAt_idx"
  ON "VoucherSpin" ("visitorId", "result", "createdAt");

CREATE INDEX IF NOT EXISTS "VoucherSpin_ip_result_createdAt_idx"
  ON "VoucherSpin" ("ipAddress", "result", "createdAt");

CREATE INDEX IF NOT EXISTS "VoucherSpin_createdAt_idx"
  ON "VoucherSpin" ("createdAt");

CREATE INDEX IF NOT EXISTS "ClientVoucher_spinId_idx"
  ON "ClientVoucher" ("spinId");

CREATE INDEX IF NOT EXISTS "ClientVoucher_status_expiresAt_idx"
  ON "ClientVoucher" ("status", "expiresAt");

CREATE INDEX IF NOT EXISTS "ClientVoucher_prize_status_createdAt_idx"
  ON "ClientVoucher" ("prizeId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ClientVoucher_whatsapp_status_idx"
  ON "ClientVoucher" ("whatsapp", "status");
