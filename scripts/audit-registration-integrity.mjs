import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [duplicateEmails, duplicateVerifiedPhones, duplicateDocuments, incompleteProfessionalTrials] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS groups FROM (SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*) > 1) duplicates`),
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS groups FROM (SELECT regexp_replace(phone, '[^0-9]', '', 'g') AS normalized FROM "User" WHERE phone IS NOT NULL AND "phoneVerified" = true GROUP BY normalized HAVING count(*) > 1) duplicates`),
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS groups FROM (SELECT regexp_replace(document, '[^0-9A-Za-z]', '', 'g') AS normalized FROM "User" WHERE document IS NOT NULL AND btrim(document) <> '' GROUP BY normalized HAVING count(*) > 1) duplicates`),
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS rows FROM "Professional" WHERE "accessGrandfathered" = false AND (("freeAccessStartedAt" IS NULL) <> ("freeAccessEndsAt" IS NULL))`),
  ]);
  console.log(JSON.stringify({
    mode: "READ_ONLY_COUNTS_NO_PII",
    duplicateEmailGroups: duplicateEmails[0]?.groups ?? null,
    duplicateVerifiedPhoneGroups: duplicateVerifiedPhones[0]?.groups ?? null,
    duplicateDocumentGroups: duplicateDocuments[0]?.groups ?? null,
    incompleteProfessionalTrialRows: incompleteProfessionalTrials[0]?.rows ?? null,
  }, null, 2));
}

main().finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
