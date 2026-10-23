import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const rawUrl = argument("--url");
const expectedSha = argument("--sha");
const expectedEnvironment = argument("--environment") ?? "production";
if (!rawUrl || !/^[0-9a-f]{40}$/i.test(expectedSha ?? "")) {
  console.error("Uso: npm run release:verify-public -- --url <https-url> --sha <sha-de-40-caracteres> [--environment production|preview]");
  process.exit(1);
}
if (!new Set(["production", "preview"]).has(expectedEnvironment)) {
  console.error("[release-public] FALHOU: environment deve ser production ou preview.");
  process.exit(1);
}

let publicOrigin;
try {
  const requestedUrl = new URL(rawUrl);
  const allowedHostname = expectedEnvironment === "production"
    ? requestedUrl.hostname === "www.elitemodell.com.br"
    : requestedUrl.hostname.endsWith(".vercel.app");
  if (requestedUrl.protocol !== "https:" || !allowedHostname || requestedUrl.username || requestedUrl.password || requestedUrl.port) {
    throw new Error("origin");
  }
  publicOrigin = requestedUrl.origin;
} catch {
  console.error(`[release-public] FALHOU: origem HTTPS inválida para ${expectedEnvironment}.`);
  process.exit(1);
}

const endpoint = new URL("/api/release", publicOrigin);
endpoint.searchParams.set("expected", expectedSha);
const response = await fetch(endpoint, { headers: { "Cache-Control": "no-cache" }, redirect: "error" });
const payload = await response.json().catch(() => null);

const environmentMatches = payload?.environment === expectedEnvironment;
const productionMatches = expectedEnvironment === "production"
  ? payload?.production === true && payload?.branch === "main"
  : payload?.production === false;
if (!response.ok || payload?.commitSha !== expectedSha || !environmentMatches || !productionMatches) {
  console.error("[release-public] FALHOU", { status: response.status, endpoint: endpoint.origin, payload });
  process.exit(1);
}

console.log(`[release-public] SHA ativo confirmado em ${endpoint.origin}: ${expectedSha}.`);
console.log("[release-public] Ainda é obrigatório validar os comportamentos funcionais afetados no domínio público.");
