import process from "node:process";
import { PrismaClient } from "@prisma/client";

const HOMOLOG_SCHEMA = "homolog_legal_20260611";
const OPERATIONAL_STATUS = "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION";
const VERSION =
  process.env.LEGAL_DOCUMENT_VERSION ?? "1.0-operational-2026-06-11";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");

if (databaseUrl.searchParams.get("schema") !== HOMOLOG_SCHEMA) {
  throw new Error(`Refusing to validate outside ${HOMOLOG_SCHEMA}.`);
}

const prisma = new PrismaClient();

async function expectDatabaseRejection(label, action) {
  const sentinel = `${label}:unexpected-success`;

  try {
    await prisma.$transaction(async (tx) => {
      await action(tx);
      throw new Error(sentinel);
    });
  } catch (error) {
    if (error instanceof Error && error.message === sentinel) {
      throw new Error(`${label} was not enforced by the database.`);
    }
    return;
  }

  throw new Error(`${label} validation did not produce a database rejection.`);
}

try {
  const [
    documents,
    versions,
    operationalVersions,
    internalDrafts,
    forbiddenVersions,
    emptyContent,
    publicationAudits,
    migrationRows,
  ] = await Promise.all([
    prisma.legalDocument.count(),
    prisma.legalDocumentVersion.count({ where: { version: VERSION } }),
    prisma.legalDocumentVersion.count({
      where: { version: VERSION, status: OPERATIONAL_STATUS },
    }),
    prisma.legalDocumentVersion.count({
      where: {
        version: VERSION,
        status: "DRAFT_INTERNAL",
        document: { internal: true },
      },
    }),
    prisma.legalDocumentVersion.count({
      where: {
        version: VERSION,
        status: {
          in: ["LEGAL_APPROVED", "COMPANY_APPROVED", "PUBLISHED", "PUBLISHED_FINAL"],
        },
      },
    }),
    prisma.legalDocumentVersion.count({
      where: { version: VERSION, content: "" },
    }),
    prisma.auditLog.count({
      where: { targetId: "operational-legal-publication-2026-06-11" },
    }),
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`,
  ]);

  if (documents !== 32 || versions !== 32) {
    throw new Error(`Expected 32 documents and versions, received ${documents}/${versions}.`);
  }
  if (operationalVersions !== 26 || internalDrafts !== 6) {
    throw new Error(
      `Expected 26 operational and 6 internal versions, received ${operationalVersions}/${internalDrafts}.`,
    );
  }
  if (forbiddenVersions !== 0 || emptyContent !== 0 || publicationAudits < 1) {
    throw new Error("Legal publication invariants are not satisfied.");
  }

  const internalVersion = await prisma.legalDocumentVersion.findFirstOrThrow({
    where: {
      version: VERSION,
      status: "DRAFT_INTERNAL",
      document: { internal: true },
    },
    select: { id: true },
  });
  await expectDatabaseRejection("internal-publication-trigger", (tx) =>
    tx.legalDocumentVersion.update({
      where: { id: internalVersion.id },
      data: { status: OPERATIONAL_STATUS },
    }),
  );

  const operationalVersion = await prisma.legalDocumentVersion.findFirstOrThrow({
    where: { version: VERSION, status: OPERATIONAL_STATUS },
    select: { id: true, content: true },
  });
  await expectDatabaseRejection("operational-version-immutability", (tx) =>
    tx.legalDocumentVersion.update({
      where: { id: operationalVersion.id },
      data: { content: `${operationalVersion.content}\nmutation-test` },
    }),
  );

  console.log(JSON.stringify({
    schema: HOMOLOG_SCHEMA,
    version: VERSION,
    documents,
    versions,
    operationalVersions,
    internalDrafts,
    forbiddenVersions,
    publicationAudits,
    migrations: migrationRows[0]?.count ?? 0,
    internalPublicationBlocked: true,
    operationalVersionImmutable: true,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
