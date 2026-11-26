import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { finalizeProfessionalRegistration } from "../src/lib/finalize-professional-registration";
import { MANUAL_DOCUMENT_PROVIDER, manualRegistrationStatus } from "../src/lib/manual-identity-policy";

const apply = process.argv.includes("--apply");
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const parsedLimit = Number(limitArgument?.split("=")[1] ?? 100);
const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(500, Math.floor(parsedLimit))) : 100;

async function reconcileSubmissions() {
  let cursor: string | undefined;
  let inspected = 0;
  let eligible = 0;
  for (;;) {
    const profiles = await prisma.professional.findMany({
      where: {
        id: cursor ? { gt: cursor } : undefined,
        verified: false,
        OR: [{ status: "DRAFT" }, { status: "PENDING_REVIEW", registrationSubmittedAt: null }],
        kycSessionId: { not: null },
        AND: [{ OR: [{ kycProvider: MANUAL_DOCUMENT_PROVIDER }, { kycProvider: { in: ["DIDIT", "PERSONA"] }, kycStatus: "APPROVED" }] }],
      },
      orderBy: { id: "asc" },
      take: limit,
      select: { id: true, userId: true, kycProvider: true, kycSessionId: true },
    });
    if (!profiles.length) break;
    cursor = profiles[profiles.length - 1].id;
    for (const profile of profiles) {
      inspected++;
      const provider = profile.kycProvider!;
      const sessionId = profile.kycSessionId!;
      const manual = provider === MANUAL_DOCUMENT_PROVIDER;
      const ready = await prisma.$transaction(async (tx) => {
        const lock = (manual ? "manual-identity:" : "didit-professional:") + profile.userId;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
        const attempt = manual ? await tx.manualIdentityAttempt.findFirst({
          where: { userId: profile.userId, submittedAt: { not: null } },
          orderBy: { submittedAt: "desc" },
        }) : null;
        if (manual && (attempt?.id !== sessionId || !["PENDING", "APPROVED"].includes(manualRegistrationStatus(attempt)))) return false;
        return finalizeProfessionalRegistration(tx, profile.userId, {
          provider, sessionId, submittedAt: attempt?.submittedAt ?? new Date(),
        }, apply);
      });
      if (ready) {
        eligible++;
        console.log(JSON.stringify({ professionalId: profile.id, provider, status: apply ? "PENDING_REVIEW" : "eligible" }));
      }
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", inspected, eligible }));
}

async function main() {
  if (process.argv.includes("--submissions")) return reconcileSubmissions();
  const [{ attemptAutomaticProfessionalPublication }, { processUploadAsset }] = await Promise.all([
    import("../src/lib/professional-auto-publication"), import("../src/lib/upload-quarantine"),
  ]);
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
