import process from "node:process";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
const configuredSchema = databaseUrl.searchParams.get("schema");

if (configuredSchema && configuredSchema !== "public") {
  throw new Error(`Refusing production audit for schema ${configuredSchema}.`);
}

const prisma = new PrismaClient();

try {
  const [
    users,
    professionals,
    properties,
    bookings,
    payments,
    legalDocuments,
    legalVersions,
    legalStatuses,
    migrationRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.professional.count(),
    prisma.property.count(),
    prisma.booking.count(),
    prisma.payment.count(),
    prisma.legalDocument.count(),
    prisma.legalDocumentVersion.count(),
    prisma.legalDocumentVersion.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM public."_prisma_migrations"`,
  ]);

  console.log(JSON.stringify({
    schema: "public",
    readOnlyAudit: true,
    users,
    professionals,
    properties,
    bookings,
    payments,
    legalDocuments,
    legalVersions,
    legalStatuses,
    migrations: migrationRows[0]?.count ?? 0,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
