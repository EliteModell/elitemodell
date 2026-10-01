import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.SCALE_BASE_URL ?? "http://127.0.0.1:3100";
const parsedBaseUrl = new URL(baseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname)) {
  throw new Error("Recusado: stress test HTTP somente contra localhost.");
}
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/elite_scale") {
  throw new Error("Recusado: stress test requer o banco isolado elite_scale.");
}
const secret = process.env.SCALE_NEXTAUTH_SECRET;
if (!secret || secret.length < 24) throw new Error("Defina SCALE_NEXTAUTH_SECRET com 24+ caracteres.");

const durationSeconds = Number(process.env.SCALE_DURATION_SECONDS ?? "8");
const levels = (process.env.SCALE_LEVELS ?? "50,100,200,500,1000")
  .split(",")
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0 && value <= 1000);
const prisma = new PrismaClient();
const diagnosticsPath = ".diagnostics/http-scale-results.json";

const routes = [
  { name: "HOME", weight: 10, path: "/" },
  { name: "SEARCH_CITY", weight: 30, path: "/api/professionals?city=Ita%C3%BAna&state=MG&limit=12" },
  { name: "LISTING", weight: 15, path: "/api/professionals?limit=12&page=2&sortBy=rating" },
  { name: "PROFILE", weight: 20, path: "/api/professionals/profissional-25000" },
  { name: "STORIES", weight: 10, path: "/api/stories" },
  { name: "LOGIN", weight: 10, path: "/login" },
  { name: "CITY_PAGE", weight: 5, path: "/cidade/mg/itauna" },
];
const weightedRoutes = routes.flatMap((route) => Array.from({ length: route.weight }, () => route));

function percentile(values, fraction) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

function summarize(samples, elapsedSeconds) {
  const latencies = samples.map((sample) => sample.latencyMs);
  const errors = samples.filter((sample) => sample.error || sample.status >= 400);
  const payloadBytes = samples.reduce((sum, sample) => sum + sample.bytes, 0);
  return {
    requests: samples.length,
    rps: Number((samples.length / elapsedSeconds).toFixed(2)),
    averageLatencyMs: Number((latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1)).toFixed(2)),
    p95LatencyMs: Number(percentile(latencies, 0.95).toFixed(2)),
    p99LatencyMs: Number(percentile(latencies, 0.99).toFixed(2)),
    errorRate: Number((errors.length / Math.max(samples.length, 1)).toFixed(4)),
    payloadBytes,
    statusCounts: samples.reduce((counts, sample) => {
      const key = sample.error ? "NETWORK_ERROR" : String(sample.status);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

async function waitForReady() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Servidor local nao ficou pronto.");
}

async function main() {
  await waitForReady();
  const token = await encode({
    secret,
    maxAge: 60 * 60,
    token: {
      id: "scale-user-00000001",
      sub: "scale-user-00000001",
      name: "Scale Viewer",
      email: "scale-1@invalid.example",
      role: "GUEST",
      accountType: "client",
      activeProfileType: "CLIENTE",
      availableProfiles: ["CLIENTE"],
      adultVerified: true,
      needsConsent: false,
    },
  });
  const cookie = `next-auth.session-token=${token}`;
  const results = [];

  async function persistResults(status = "RUNNING") {
    const report = {
      generatedAt: new Date().toISOString(),
      environment: "LOCAL_ISOLATED_POSTGRES_SYNTHETIC_DATA_EXTERNAL_PROVIDERS_NOT_CALLED",
      status,
      durationSeconds,
      results,
    };
    await mkdir(".diagnostics", { recursive: true });
    await writeFile(diagnosticsPath, JSON.stringify(report, null, 2), "utf8");
  }

  await persistResults();

  for (const concurrency of levels) {
    const samples = [];
    const routeSamples = new Map(routes.map((route) => [route.name, []]));
    let maxDbConnections = 0;
    let monitoring = true;
    const monitor = (async () => {
      while (monitoring) {
        const rows = await prisma.$queryRawUnsafe(`
          SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()
        `).catch(() => [{ count: 0 }]);
        maxDbConnections = Math.max(maxDbConnections, rows[0]?.count ?? 0);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    })();
    const startedAt = performance.now();
    const deadline = startedAt + durationSeconds * 1000;
    const levelAbort = new AbortController();
    const hardStop = setTimeout(() => levelAbort.abort(), (durationSeconds + 12) * 1000);
    const workers = Promise.all(Array.from({ length: concurrency }, async (_, workerId) => {
      let requestIndex = workerId;
      while (performance.now() < deadline) {
        const route = weightedRoutes[requestIndex % weightedRoutes.length];
        requestIndex += concurrency;
        const requestStarted = performance.now();
        let status = 0;
        let bytes = 0;
        let error = null;
        try {
          const response = await fetch(`${baseUrl}${route.path}`, {
            headers: { cookie, accept: route.name.includes("PAGE") || ["HOME", "LOGIN"].includes(route.name) ? "text/html" : "application/json" },
            redirect: "manual",
            signal: AbortSignal.any([AbortSignal.timeout(10_000), levelAbort.signal]),
          });
          status = response.status;
          bytes = (await response.arrayBuffer()).byteLength;
        } catch (cause) {
          error = cause instanceof Error ? cause.name : "UNKNOWN";
        }
        const sample = { route: route.name, status, bytes, error, latencyMs: performance.now() - requestStarted };
        samples.push(sample);
        routeSamples.get(route.name).push(sample);
      }
    }));
    await workers;
    clearTimeout(hardStop);
    const elapsedSeconds = (performance.now() - startedAt) / 1000;
    monitoring = false;
    await Promise.race([
      monitor,
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    const summary = {
      concurrency,
      elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
      ...summarize(samples, elapsedSeconds),
      maxDbConnections,
      routes: Object.fromEntries([...routeSamples].map(([name, values]) => [name, summarize(values, elapsedSeconds)])),
    };
    results.push(summary);
    console.log(JSON.stringify(summary));
    await persistResults();
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  await persistResults("COMPLETE");
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
