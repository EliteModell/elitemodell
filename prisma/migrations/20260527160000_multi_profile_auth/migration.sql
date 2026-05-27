CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ClientProfile" ("id", "userId", "displayName", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "name",
  COALESCE("clientStatus", 'UNVERIFIED'::"ClientStatus"),
  NOW(),
  NOW()
FROM "User"
ON CONFLICT ("userId") DO NOTHING;
