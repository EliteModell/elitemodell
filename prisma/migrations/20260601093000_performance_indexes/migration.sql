CREATE INDEX IF NOT EXISTS "Story_expiresAt_createdAt_idx"
  ON "Story"("expiresAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_bookingId_createdAt_idx"
  ON "Message"("bookingId", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_bookingId_read_idx"
  ON "Message"("bookingId", "read");

CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_idx"
  ON "Favorite"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Appointment_clientId_date_idx"
  ON "Appointment"("clientId", "date");

CREATE INDEX IF NOT EXISTS "Appointment_professionalId_date_idx"
  ON "Appointment"("professionalId", "date");

CREATE INDEX IF NOT EXISTS "ProfessionalPhoto_professionalId_cover_order_idx"
  ON "ProfessionalPhoto"("professionalId", "cover", "order");

CREATE INDEX IF NOT EXISTS "ProfessionalReview_professionalId_hidden_createdAt_idx"
  ON "ProfessionalReview"("professionalId", "hidden", "createdAt");
