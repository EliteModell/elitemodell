import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const isolation = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("./validate-homologation-isolation.mjs", import.meta.url))],
  { env: process.env, encoding: "utf8" },
);

if (isolation.status !== 0) {
  process.stderr.write(isolation.stderr || "[homologation-schema] Isolamento nao aprovado.\n");
  process.exit(isolation.status ?? 1);
}

const prisma = new PrismaClient();
const requiredMigrations = [
  "20261023110000_add_professional_price15min",
];

try {
  const columns = await prisma.$queryRaw`
    SELECT data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Professional'
      AND column_name = 'price15min'
  `;
  const column = columns[0];
  if (!column || column.data_type !== "double precision" || column.is_nullable !== "YES") {
    throw new Error("Professional.price15min ausente ou com tipo/nulabilidade incorretos.");
  }

  const applied = await prisma.$queryRaw`
    SELECT migration_name
    FROM public._prisma_migrations
    WHERE migration_name IN (
      '20261023110000_add_professional_price15min'
    )
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `;
  const names = new Set(applied.map((entry) => entry.migration_name));
  const missing = requiredMigrations.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Migrations de homologacao pendentes: ${missing.join(", ")}.`);

  console.log("[homologation-schema] APROVADO: coluna price15min e migrations confirmadas no banco isolado.");
} catch (cause) {
  console.error(`[homologation-schema] BLOQUEADO: ${cause instanceof Error ? cause.message : "falha desconhecida"}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
