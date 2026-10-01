import "dotenv/config";

import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/elite_scale") {
  throw new Error("Recusado: teste de cadastro somente no banco local elite_scale.");
}

const prisma = new PrismaClient();
const levels = [10, 25, 50, 100];
const prefix = `scale-registration-${Date.now()}`;

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

async function runUnique(level) {
  const started = performance.now();
  const attempts = await Promise.allSettled(Array.from({ length: level }, async (_, index) => {
    const requestStarted = performance.now();
    await prisma.user.create({
      data: {
        email: `${prefix}-unique-${level}-${index}@invalid.example`,
        name: "Cadastro sintetico",
        accountType: "client",
        birthDate: new Date("1990-01-01"),
        lgpdConsent: true,
        termsConsent: true,
        clientProfile: { create: {} },
      },
    });
    return performance.now() - requestStarted;
  }));
  const latencies = attempts.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const elapsedMs = performance.now() - started;
  return {
    concurrency: level,
    successes: latencies.length,
    errors: attempts.length - latencies.length,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    registrationsPerSecond: Number((latencies.length / (elapsedMs / 1000)).toFixed(2)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
  };
}

async function runRetryCollision(level) {
  const email = `${prefix}-retry-${level}@invalid.example`;
  const attempts = await Promise.allSettled(Array.from({ length: level }, () => prisma.user.create({
    data: { email, name: "Retry sintetico", clientProfile: { create: {} } },
  })));
  const rows = await prisma.user.count({ where: { email } });
  return {
    concurrency: level,
    successfulResponses: attempts.filter((item) => item.status === "fulfilled").length,
    rejectedWrites: attempts.filter((item) => item.status === "rejected").length,
    persistedUsers: rows,
    routeImpactBeforeFix: "unique conflicts reach the generic catch and become HTTP 500",
  };
}

async function runAtomicRetry(level) {
  const email = `${prefix}-atomic-${level}@invalid.example`;
  const attempts = await Promise.allSettled(Array.from({ length: level }, async () => {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: "Retry atomico" },
      update: {},
      select: { id: true },
    });
    await prisma.clientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    return user.id;
  }));
  const ids = attempts.filter((item) => item.status === "fulfilled").map((item) => item.value);
  return {
    concurrency: level,
    successfulResponses: ids.length,
    errors: attempts.length - ids.length,
    distinctUserIds: new Set(ids).size,
    persistedUsers: await prisma.user.count({ where: { email } }),
    errorCodes: [...new Set(attempts.filter((item) => item.status === "rejected").map((item) => item.reason?.code ?? item.reason?.name ?? "unknown"))],
  };
}

async function runLockedRetry(level) {
  const email = `${prefix}-locked-${level}@invalid.example`;
  const started = performance.now();
  const attempts = await Promise.allSettled(Array.from({ length: level }, () => prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`registration:${email}`}))`;
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name: "Retry serializado" },
      update: {},
      select: { id: true },
    });
    await tx.clientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    return user.id;
  }, { maxWait: 10_000, timeout: 10_000 })));
  const ids = attempts.filter((item) => item.status === "fulfilled").map((item) => item.value);
  return {
    concurrency: level,
    successfulResponses: ids.length,
    errors: attempts.length - ids.length,
    distinctUserIds: new Set(ids).size,
    persistedUsers: await prisma.user.count({ where: { email } }),
    elapsedMs: Number((performance.now() - started).toFixed(2)),
    errorCodes: [...new Set(attempts.filter((item) => item.status === "rejected").map((item) => item.reason?.code ?? item.reason?.name ?? "unknown"))],
  };
}

async function main() {
  const uniqueRegistrations = [];
  const currentRetryBehavior = [];
  const atomicRetryBehavior = [];
  const lockedRetryBehavior = [];
  try {
    for (const level of levels) uniqueRegistrations.push(await runUnique(level));
    for (const level of levels) currentRetryBehavior.push(await runRetryCollision(level));
    for (const level of levels) atomicRetryBehavior.push(await runAtomicRetry(level));
    for (const level of levels) lockedRetryBehavior.push(await runLockedRetry(level));

    const sharedPhone = `3199${String(Date.now()).slice(-7)}`;
    const sharedDocument = `CPF${Date.now()}`;
    await prisma.user.createMany({ data: [
      { email: `${prefix}-identity-a@invalid.example`, phone: sharedPhone, phoneVerified: true, document: sharedDocument },
      { email: `${prefix}-identity-b@invalid.example`, phone: sharedPhone, phoneVerified: true, document: sharedDocument },
    ] }).then(
      () => ({ accepted: true }),
      (error) => ({ accepted: false, error: error?.code ?? error?.name ?? "unknown" }),
    ).then((identityConstraint) => {
      console.log(JSON.stringify({
        environment: "LOCAL_ISOLATED_DATABASE_NO_EXTERNAL_PROVIDERS",
        uniqueRegistrations,
        currentRetryBehavior,
        atomicRetryBehavior,
        lockedRetryBehavior,
        identityConstraint,
      }, null, 2));
    });
  } finally {
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  }
}

main().finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
