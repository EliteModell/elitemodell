import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { attemptAutomaticProfessionalPublication } from "../src/lib/professional-auto-publication";
import { processUploadAsset } from "../src/lib/upload-quarantine";

const apply = process.argv.includes("--apply");
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const parsedLimit = Number(limitArgument?.split("=")[1] ?? 100);
const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(500, Math.floor(parsedLimit))) : 100;

async function main() {
  const candidates = await prisma.professional.findMany({
    where: {
      registrationSubmittedAt: { not: null },
      kycProvider: "DIDIT",
      kycStatus: "APPROVED",
      status: { in: ["DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED"] },
      user: { blocked: false },
    },
    orderBy: { registrationSubmittedAt: "asc" },
    take: limit,
    select: { id: true, userId: true, status: true },
  });

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", candidates: candidates.length, limit }, null, 2));
    return;
  }

  const results: Array<{ professionalId: string; before: string; after: string; published: boolean; blockers: string[] }> = [];
  for (const candidate of candidates) {
    const pendingAssets = await prisma.uploadAsset.findMany({
      where: {
        userId: candidate.userId,
        category: "image",
        folder: { startsWith: "profiles" },
        status: { notIn: ["APPROVED", "REJECTED"] },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true },
    });
    for (const asset of pendingAssets) {
      await processUploadAsset(asset.id).catch((cause) => {
        console.warn(JSON.stringify({ event: "asset-processing-deferred", assetId: asset.id, reason: cause instanceof Error ? cause.name : "unknown" }));
      });
    }
    const publication = await attemptAutomaticProfessionalPublication(candidate.id, "production-backfill");
    results.push({
      professionalId: candidate.id,
      before: candidate.status,
      after: publication.status,
      published: publication.published,
      blockers: publication.blockers.map((blocker) => blocker.code),
    });
  }

  console.log(JSON.stringify({
    mode: "apply",
    candidates: candidates.length,
    published: results.filter((result) => result.published).length,
    results,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
