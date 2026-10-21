-- Dados declarados pela profissional. Campos opcionais preservam todos os cadastros existentes.
ALTER TABLE "Professional"
  ADD COLUMN "genderIdentity" TEXT,
  ADD COLUMN "genderSelfDescription" TEXT,
  ADD COLUMN "transIdentity" TEXT;
