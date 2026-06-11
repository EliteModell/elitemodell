CREATE TYPE "AdminRole" AS ENUM (
  'ADMIN_MASTER',
  'ADMIN_GERAL',
  'MODERADOR_CADASTROS',
  'MODERADOR_CONTEUDO',
  'SUPORTE',
  'FINANCEIRO'
);

ALTER TABLE "AuditLog"
  ADD COLUMN "actorIdentifier" TEXT,
  ALTER COLUMN "adminId" DROP NOT NULL;

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_adminId_fkey";
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AdminRoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "grantedById" TEXT,
  "reason" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminMfaEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "recoveryCodeHash" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminMfaEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminMfaSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminMfaSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminMfaEnrollment_userId_key" ON "AdminMfaEnrollment"("userId");
CREATE UNIQUE INDEX "AdminMfaSession_tokenHash_key" ON "AdminMfaSession"("tokenHash");
CREATE INDEX "AdminRoleAssignment_userId_active_idx" ON "AdminRoleAssignment"("userId", "active");
CREATE INDEX "AdminRoleAssignment_role_active_idx" ON "AdminRoleAssignment"("role", "active");
CREATE INDEX "AdminRoleAssignment_grantedAt_idx" ON "AdminRoleAssignment"("grantedAt");
CREATE INDEX "AdminMfaEnrollment_verifiedAt_idx" ON "AdminMfaEnrollment"("verifiedAt");
CREATE INDEX "AdminMfaSession_userId_expiresAt_idx" ON "AdminMfaSession"("userId", "expiresAt");
CREATE INDEX "AdminMfaSession_expiresAt_idx" ON "AdminMfaSession"("expiresAt");

ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminMfaEnrollment" ADD CONSTRAINT "AdminMfaEnrollment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMfaSession" ADD CONSTRAINT "AdminMfaSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One-time backfill from the former runtime bootstrap account.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE lower("email") = 'brunorochalp3@gmail.com';

INSERT INTO "AdminRoleAssignment" (
  "id", "userId", "role", "active", "reason", "grantedAt", "createdAt", "updatedAt"
)
SELECT
  'bootstrap_' || md5("id"), "id", 'ADMIN_MASTER'::"AdminRole", true,
  'Backfill da administracao existente durante remocao do e-mail hardcoded',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE lower("email") = 'brunorochalp3@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM "AdminRoleAssignment" a
    WHERE a."userId" = "User"."id" AND a."active" = true
  );

INSERT INTO "AdminRoleAssignment" (
  "id", "userId", "role", "active", "reason", "grantedAt", "createdAt", "updatedAt"
)
SELECT
  'role_' || md5("id"), "id", 'ADMIN_GERAL'::"AdminRole", true,
  'Backfill de usuarios com papel ADMIN',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "AdminRoleAssignment" a
    WHERE a."userId" = "User"."id" AND a."active" = true
  );
