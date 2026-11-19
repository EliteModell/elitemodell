CREATE TABLE "RegistrationEvent" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "identity" TEXT,
  "accountType" TEXT,
  "stage" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "status" INTEGER NOT NULL,
  "reason" TEXT,
  "channel" TEXT,
  "provider" TEXT,
  "providerCode" INTEGER,
  "providerReference" TEXT,
  "step" INTEGER
);

CREATE INDEX "RegistrationEvent_createdAt_id_idx" ON "RegistrationEvent" ("createdAt", "id");
CREATE INDEX "RegistrationEvent_identity_createdAt_idx" ON "RegistrationEvent" ("identity", "createdAt");
CREATE INDEX "RegistrationEvent_accountType_createdAt_idx" ON "RegistrationEvent" ("accountType", "createdAt");

ALTER TABLE "RegistrationEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "RegistrationEvent" FROM PUBLIC;
