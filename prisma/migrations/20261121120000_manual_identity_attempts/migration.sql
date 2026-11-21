BEGIN;

CREATE TABLE "ManualIdentityAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "backUnavailable" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "noticeVersion" TEXT NOT NULL,
    "evidenceHashes" JSONB,
    "challengeDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3) NOT NULL,
    "purgedAt" TIMESTAMP(3),
    "reviewVersion" INTEGER NOT NULL DEFAULT 0,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "birthDate" DATE,
    CONSTRAINT "ManualIdentityAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualIdentityAttempt_userId_createdAt_idx" ON "ManualIdentityAttempt"("userId", "createdAt");
CREATE INDEX "ManualIdentityAttempt_status_submittedAt_idx" ON "ManualIdentityAttempt"("status", "submittedAt");
CREATE INDEX "ManualIdentityAttempt_purgedAt_purgeAfter_idx" ON "ManualIdentityAttempt"("purgedAt", "purgeAfter");

-- The Prisma migration owner remains the database-side service for this table.
ALTER TABLE "ManualIdentityAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "ManualIdentityAttempt" FROM PUBLIC;

DO $manual_identity_acl$
DECLARE
    api_role text;
BEGIN
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'authenticator'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE "ManualIdentityAttempt" FROM %I', api_role);
            IF EXISTS (
                SELECT 1 FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS access(privilege)
                WHERE has_table_privilege(api_role, '"ManualIdentityAttempt"', access.privilege)
            ) THEN
                RAISE EXCEPTION 'ManualIdentityAttempt has inherited API role privileges';
            END IF;
        END IF;
    END LOOP;
END
$manual_identity_acl$;

COMMIT;
