import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/elite_scale") {
  throw new Error("Recusado: experimento de indices somente no banco local elite_scale.");
}

const prisma = new PrismaClient();
const statements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX IF NOT EXISTS "Professional_currentServiceCity_trgm_idx" ON "Professional" USING gin ("currentServiceCity" gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS "Professional_currentServiceState_trgm_idx" ON "Professional" USING gin ("currentServiceState" gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS "Professional_displayName_trgm_idx" ON "Professional" USING gin ("displayName" gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS "Professional_bio_trgm_idx" ON "Professional" USING gin (bio gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS "Professional_public_rank_idx" ON "Professional" (status, "boostActive" DESC, "planPriority" DESC, featured DESC, rating DESC, "totalReviews" DESC)`,
  `CREATE INDEX IF NOT EXISTS "ProfessionalSpecialty_professionalId_idx" ON "ProfessionalSpecialty" ("professionalId")`,
  `ANALYZE "Professional"`,
];

try {
  for (const statement of statements) await prisma.$executeRawUnsafe(statement);
  console.log(JSON.stringify({ applied: statements.length, database: databaseUrl.pathname.slice(1) }));
} finally {
  await prisma.$disconnect();
}
