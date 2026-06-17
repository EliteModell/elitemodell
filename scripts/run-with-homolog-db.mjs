import { spawn } from "node:child_process";
import process from "node:process";
import { config } from "dotenv";

const HOMOLOG_SCHEMA = "homolog_legal_20260611";

config({ path: ".env" });

function databaseUrlForHomologation(value, variableName) {
  if (!value) {
    throw new Error(`${variableName} is required to run against homologation.`);
  }

  const url = new URL(value);
  url.searchParams.set("schema", HOMOLOG_SCHEMA);
  return url.toString();
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  throw new Error("Usage: node scripts/run-with-homolog-db.mjs <command> [...args]");
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrlForHomologation(process.env.DATABASE_URL, "DATABASE_URL"),
  DIRECT_URL: databaseUrlForHomologation(
    process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    "DIRECT_URL",
  ),
  HOMOLOGATION_SCHEMA: HOMOLOG_SCHEMA,
};

const child = spawn(command, args, {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
