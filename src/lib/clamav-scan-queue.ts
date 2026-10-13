import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { retryDelaySeconds } from "@/lib/clamav-async-state";

const DEFAULT_LEASE_SECONDS = 10 * 60;

export async function enqueueMalwareScan(assetId: string) {
  return prisma.malwareScanJob.upsert({
    where: { assetId },
    create: { assetId, status: "QUEUED" },
    update: {
      status: "QUEUED",
      availableAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: null,
      taskName: null,
      dispatchedAt: null,
      lastDispatchError: null,
    },
  });
}

export async function claimMalwareScan(assetId: string, leaseSeconds = DEFAULT_LEASE_SECONDS) {
  const now = new Date();
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000);
  const claimed = await prisma.malwareScanJob.updateMany({
    where: {
      assetId,
      availableAt: { lte: now },
      completedAt: null,
      OR: [
        { status: { in: ["QUEUED", "RETRY"] }, leaseExpiresAt: null },
        { status: "PROCESSING", leaseExpiresAt: { lt: now } },
      ],
    },
    data: {
      status: "PROCESSING",
      leaseToken,
      leaseExpiresAt,
      attempts: { increment: 1 },
      lastError: null,
    },
  });
  if (claimed.count !== 1) return null;
  return prisma.malwareScanJob.findUniqueOrThrow({ where: { assetId } });
}

export async function completeMalwareScan(assetId: string, leaseToken: string) {
  return prisma.malwareScanJob.updateMany({
    where: { assetId, leaseToken, status: "PROCESSING" },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
}

export async function retryMalwareScan(assetId: string, leaseToken: string, attempts: number, reason: string) {
  const delaySeconds = retryDelaySeconds(attempts);
  return prisma.malwareScanJob.updateMany({
    where: { assetId, leaseToken, status: "PROCESSING" },
    data: {
      status: "RETRY",
      availableAt: new Date(Date.now() + delaySeconds * 1000),
      leaseToken: null,
      leaseExpiresAt: null,
      lastError: reason.slice(0, 2_000),
    },
  });
}

export async function failMalwareScan(assetId: string, leaseToken: string, reason: string) {
  return prisma.malwareScanJob.updateMany({
    where: { assetId, leaseToken, status: "PROCESSING" },
    data: {
      status: "FAILED",
      leaseToken: null,
      leaseExpiresAt: null,
      lastError: reason.slice(0, 2_000),
    },
  });
}
