import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/elite_scale") {
  throw new Error("Recusado: benchmark SQL somente no banco local elite_scale.");
}
const prisma = new PrismaClient();

async function explain(name, sql) {
  const started = performance.now();
  const result = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  const elapsedMs = performance.now() - started;
  const document = result[0]["QUERY PLAN"][0];
  return {
    name,
    wallMs: Number(elapsedMs.toFixed(3)),
    planningMs: document["Planning Time"],
    executionMs: document["Execution Time"],
    rootNode: document.Plan["Node Type"],
    plan: document.Plan,
  };
}

async function main() {
  const count = await prisma.professional.count();
  const queries = [
    await explain("SEARCH_CITY_PAGE", `
      SELECT p."id", p."slug", p."displayName", p."rating", p."totalReviews"
      FROM "Professional" p
      WHERE p."status" = 'ACTIVE'
        AND p."currentServiceCity" ILIKE 'Itaúna'
        AND p."currentServiceState" ILIKE 'MG'
      ORDER BY p."boostActive" DESC, p."planPriority" DESC, p."featured" DESC,
               p."rating" DESC, p."totalReviews" DESC
      LIMIT 12 OFFSET 0
    `),
    await explain("SEARCH_CITY_COUNT", `
      SELECT count(*) FROM "Professional" p
      WHERE p."status" = 'ACTIVE'
        AND p."currentServiceCity" ILIKE 'Itaúna'
        AND p."currentServiceState" ILIKE 'MG'
    `),
    await explain("SEARCH_TEXT", `
      SELECT p."id", p."slug", p."displayName"
      FROM "Professional" p
      WHERE p."status" = 'ACTIVE'
        AND (p."displayName" ILIKE '%Profissional 42%' OR p."city" ILIKE '%Profissional 42%' OR p."bio" ILIKE '%Profissional 42%')
      ORDER BY p."boostActive" DESC, p."planPriority" DESC, p."featured" DESC, p."rating" DESC
      LIMIT 12
    `),
    await explain("PROFILE_BY_SLUG", `
      SELECT p.* FROM "Professional" p WHERE p."slug" = 'profissional-${Math.max(1, Math.floor(count / 2))}' LIMIT 1
    `),
    await explain("PROFILE_PHOTOS", `
      SELECT ph.* FROM "ProfessionalPhoto" ph
      WHERE ph."professionalId" = 'scale-pro-${String(Math.max(1, Math.floor(count / 2))).padStart(8, "0")}'
        AND ph."hiddenAt" IS NULL
      ORDER BY ph."order" ASC
    `),
    await explain("ADMIN_STATUS_COUNTS", `
      SELECT p."status", p."kycStatus", count(*)
      FROM "Professional" p
      GROUP BY p."status", p."kycStatus"
    `),
    await explain("ADMIN_PENDING_PAGE", `
      SELECT p."id", p."displayName", p."city", p."createdAt"
      FROM "Professional" p
      WHERE p."status" = 'PENDING_REVIEW'
      ORDER BY p."createdAt" DESC
      LIMIT 24
    `),
  ];
  const connections = await prisma.$queryRawUnsafe(`
    SELECT state, count(*)::int AS count
    FROM pg_stat_activity WHERE datname = current_database()
    GROUP BY state ORDER BY state NULLS FIRST
  `);
  const report = { generatedAt: new Date().toISOString(), professionals: count, queries, connections };
  await mkdir(".diagnostics", { recursive: true });
  await writeFile(`.diagnostics/scale-db-${count}.json`, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    professionals: count,
    queries: queries.map(({ name, wallMs, planningMs, executionMs, rootNode }) => ({ name, wallMs, planningMs, executionMs, rootNode })),
    connections,
  }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
