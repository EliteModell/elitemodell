import "dotenv/config";

import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

if (process.platform !== "win32") throw new Error("Este orquestrador foi validado para Windows.");
if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET local ausente.");

const localDatabaseUrl = "postgresql://postgres@127.0.0.1:55433/elite_scale?schema=public&connection_limit=20&pool_timeout=10";
const localDirectUrl = "postgresql://postgres@127.0.0.1:55433/elite_scale?schema=public";
const baseUrl = "http://127.0.0.1:3100";
const blockedExternalVariables = [
  "ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID", "RESEND_API_KEY", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID",
  "PERSONA_API_KEY", "PERSONA_TEMPLATE_ID", "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
];
const isolatedEnvironment = {
  ...process.env,
  DATABASE_URL: localDatabaseUrl,
  DIRECT_URL: localDirectUrl,
  NEXTAUTH_URL: baseUrl,
  SCALE_BASE_URL: baseUrl,
  SCALE_NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  SCALE_DURATION_SECONDS: process.env.SCALE_DURATION_SECONDS ?? "8",
  SCALE_LEVELS: process.env.SCALE_LEVELS ?? "50,100,200,500,1000",
};
for (const name of blockedExternalVariables) delete isolatedEnvironment[name];

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: isolatedEnvironment,
    windowsHide: true,
    stdio: options.stdio ?? "inherit",
  });
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
  throw new Error("Next local nao ficou pronto.");
}

function readProcessMetrics(pid) {
  const command = `$p=Get-Process -Id ${pid} -ErrorAction Stop; [Console]::WriteLine(($p.WorkingSet64.ToString() + ',' + $p.TotalProcessorTime.TotalMilliseconds.ToString([Globalization.CultureInfo]::InvariantCulture)))`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    windowsHide: true,
    encoding: "utf8",
  });
  const [workingSetBytes, cpuMs] = result.stdout.trim().split(",").map(Number);
  return Number.isFinite(workingSetBytes) && Number.isFinite(cpuMs) ? { workingSetBytes, cpuMs } : null;
}

async function terminateProcessTree(pid) {
  await new Promise((resolve) => {
    const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    killer.on("close", resolve);
    killer.on("error", resolve);
  });
}

async function main() {
  const server = run("node.exe", [".\\node_modules\\next\\dist\\bin\\next", "start", "-H", "127.0.0.1", "-p", "3100"], { stdio: "ignore" });
  const samples = [];
  let sampling = true;
  const sampler = (async () => {
    let previous = null;
    while (sampling) {
      const current = readProcessMetrics(server.pid);
      if (current) {
        const now = Date.now();
        samples.push({
          at: new Date(now).toISOString(),
          workingSetBytes: current.workingSetBytes,
          cpuMs: current.cpuMs,
          cpuPercent: previous
            ? Number((((current.cpuMs - previous.cpuMs) / (now - previous.at)) * 100).toFixed(2))
            : null,
        });
        previous = { ...current, at: now };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  })();
  try {
    await waitForReady();
    const load = run("node.exe", ["scripts\\run-scale-load.mjs"]);
    const exitCode = await new Promise((resolve) => {
      load.on("close", resolve);
      load.on("error", () => resolve(1));
    });
    if (exitCode !== 0) throw new Error(`Carga local terminou com exit code ${exitCode}.`);
  } finally {
    sampling = false;
    await sampler;
    await terminateProcessTree(server.pid);
  }
  const metrics = {
    generatedAt: new Date().toISOString(),
    serverPid: server.pid,
    samples: samples.length,
    maxWorkingSetBytes: Math.max(0, ...samples.map((sample) => sample.workingSetBytes)),
    maxCpuPercentOneCoreEquivalent: Math.max(0, ...samples.map((sample) => sample.cpuPercent ?? 0)),
    measurements: samples,
  };
  await mkdir(".diagnostics", { recursive: true });
  await writeFile(".diagnostics/http-scale-process.json", JSON.stringify(metrics, null, 2), "utf8");
  console.log(JSON.stringify({
    maxWorkingSetBytes: metrics.maxWorkingSetBytes,
    maxCpuPercentOneCoreEquivalent: metrics.maxCpuPercentOneCoreEquivalent,
    samples: metrics.samples,
  }, null, 2));
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
