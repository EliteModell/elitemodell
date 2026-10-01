import "dotenv/config";

import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const output = ".diagnostics/database-capacity.json";

function safeConnectionConfig(value) {
  if (!value) return null;
  const url = new URL(value);
  const allowedParameters = ["pgbouncer", "connection_limit", "pool_timeout", "connect_timeout", "sslmode"];
  return {
    hostClass: url.hostname.includes("pooler.supabase.com") ? "SUPABASE_POOLER" : "DIRECT_OR_OTHER",
    port: url.port || "5432",
    parameters: Object.fromEntries(allowedParameters.flatMap((name) => {
      const configured = url.searchParams.get(name);
      return configured === null ? [] : [[name, configured]];
    })),
  };
}

async function main() {
  const [settings, activity, databaseSize, relationSize, rowCounts, indexUsage] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT name, setting, unit
      FROM pg_settings
      WHERE name IN (
        'max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem',
        'effective_cache_size', 'statement_timeout', 'idle_in_transaction_session_timeout'
      )
      ORDER BY name
    `),
    prisma.$queryRawUnsafe(`
      SELECT state, count(*)::int AS connections
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
      ORDER BY state NULLS FIRST
    `),
    prisma.$queryRawUnsafe(`SELECT pg_database_size(current_database())::bigint::text AS bytes`),
    prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0)::bigint::text AS total_bytes,
        COALESCE(sum(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0)::bigint::text AS table_bytes,
        COALESCE(sum(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0)::bigint::text AS index_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `),
    prisma.$queryRawUnsafe(`
      SELECT relname AS table_name, n_live_tup::bigint::text AS estimated_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname IN ('User', 'Professional', 'ProfessionalPhoto', 'UploadAsset', 'Story', 'Review', 'AuditLog')
      ORDER BY relname
    `),
    prisma.$queryRawUnsafe(`
      SELECT relname AS table_name, seq_scan::bigint::text, idx_scan::bigint::text,
             n_live_tup::bigint::text AS estimated_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY (seq_scan - COALESCE(idx_scan, 0)) DESC
      LIMIT 20
    `),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY_PRODUCTION",
    connection: {
      runtime: safeConnectionConfig(process.env.DATABASE_URL),
      migrations: safeConnectionConfig(process.env.DIRECT_URL),
    },
    settings,
    activity,
    databaseSize: databaseSize[0],
    relationSize: relationSize[0],
    rowCounts,
    indexUsage,
  };
  await mkdir(".diagnostics", { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
