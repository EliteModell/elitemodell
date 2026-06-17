import "dotenv/config";

import process from "node:process";
import { PrismaClient } from "@prisma/client";

const OPERATIONAL_STATUS =
  "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION";
const VERSION = "1.0-operational-2026-06-11";
const prisma = new PrismaClient();

async function main() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  if ((databaseUrl.searchParams.get("schema") ?? "public") !== "public") {
    throw new Error("A validação de produção exige o schema public.");
  }

  const [
    documents,
    versions,
    operationalVersions,
    internalDrafts,
    forbiddenVersions,
    emptyContent,
    publicationAudits,
    acceptances,
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
      where: { targetId: "production-legal-publication-2026-06-11" },
    }),
    prisma.userAcceptance.count(),
  ]);

  if (documents !== 32 || versions !== 32) {
    throw new Error(
      `Esperados 32 documentos/versões; encontrados ${documents}/${versions}.`,
    );
  }
  if (operationalVersions !== 26 || internalDrafts !== 6) {
    throw new Error(
      `Esperadas 26 versões públicas e 6 internas; encontradas ${operationalVersions}/${internalDrafts}.`,
    );
  }
  if (forbiddenVersions || emptyContent || publicationAudits < 1) {
    throw new Error("As invariantes da publicação operacional não foram satisfeitas.");
  }

  console.log(
    JSON.stringify(
      {
        schema: "public",
        documents,
        version: VERSION,
        operationalVersions,
        internalDrafts,
        forbiddenVersions,
        publicationAudits,
        existingAcceptancesPreserved: acceptances,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
