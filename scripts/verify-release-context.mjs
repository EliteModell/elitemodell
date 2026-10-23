import { execFileSync } from "node:child_process";

const EXPECTED_OWNER = "EliteModell";
const EXPECTED_REPOSITORY = "elitemodell";
const EXPECTED_PRODUCTION_BRANCH = "main";

function fail(message) {
  console.error(`[release-context] BLOQUEADO: ${message}`);
  process.exitCode = 1;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function validateLocalContext() {
  const sha = git("rev-parse", "HEAD");
  const branch = git("branch", "--show-current") || "detached";
  const dirty = git("status", "--porcelain");

  if (dirty) {
    fail("o checkout local possui alterações. Ele pode ser validado, mas nunca usado para Production.");
    return;
  }
  if (branch !== EXPECTED_PRODUCTION_BRANCH) {
    fail(`a preparação de release local exige a branch ${EXPECTED_PRODUCTION_BRANCH}; branch atual: ${branch}.`);
    return;
  }
  console.log(`[release-context] Contexto local limpo: ${branch}@${sha}.`);
}

function validateVercelProductionContext() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repository = process.env.VERCEL_GIT_REPO_SLUG;

  if (branch !== EXPECTED_PRODUCTION_BRANCH) fail(`Production exige VERCEL_GIT_COMMIT_REF=${EXPECTED_PRODUCTION_BRANCH}; recebido: ${branch || "ausente"}.`);
  if (!/^[0-9a-f]{40}$/i.test(sha ?? "")) fail("VERCEL_GIT_COMMIT_SHA ausente ou inválido; o deployment não é rastreável até um commit Git.");
  if (owner !== EXPECTED_OWNER) fail(`repositório Git inesperado: owner ${owner || "ausente"}.`);
  if (repository !== EXPECTED_REPOSITORY) fail(`repositório Git inesperado: slug ${repository || "ausente"}.`);

  if (!process.exitCode) console.log(`[release-context] Production Git validada: ${owner}/${repository}:${branch}@${sha}.`);
}

if (process.env.VERCEL === "1" && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production")) {
  validateVercelProductionContext();
} else if (process.argv.includes("--local-release")) {
  validateLocalContext();
} else {
  console.log("[release-context] Fora de Production; nenhuma publicação autorizada por esta verificação.");
}
