import process from "node:process";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schemas = ["public", "homolog_legal_20260611"];

try {
  const result = {};

  for (const schema of schemas) {
    const migrations = await prisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at, applied_steps_count
       FROM "${schema}"."_prisma_migrations"
       ORDER BY migration_name`,
    );
    const legalVersionColumns = await prisma.$queryRawUnsafe(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = 'LegalDocumentVersion'
         AND column_name IN (
           'operationalPublisherName',
           'legalRepresentativeName',
           'applicableChannel',
           'operationalPublicationNote'
         )
       ORDER BY column_name`,
      schema,
    );
    const acceptanceColumns = await prisma.$queryRawUnsafe(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name IN ('UserAcceptance', 'CheckoutAcceptance')
         AND column_name IN ('acceptanceType', 'required', 'route', 'language')
       ORDER BY table_name, column_name`,
      schema,
    );
    const legalCounts = await prisma.$queryRawUnsafe(
      `SELECT
         (SELECT COUNT(*)::int FROM "${schema}"."LegalDocument") AS documents,
         (SELECT COUNT(*)::int FROM "${schema}"."LegalDocumentVersion") AS versions`,
    );

    result[schema] = {
      migrationCount: migrations.length,
      latestMigrations: migrations.slice(-10),
      legalVersionColumns,
      acceptanceColumns,
      legalCounts: legalCounts[0],
    };
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
