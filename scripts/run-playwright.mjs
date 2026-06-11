import { spawn } from "node:child_process";
import process from "node:process";
import "dotenv/config";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseURL = new URL(baseURL);
const serverPort =
  parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? "443" : "80");
const isWindows = process.platform === "win32";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerReady() {
  try {
    const response = await fetch(baseURL, { signal: AbortSignal.timeout(1500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isServerReady()) return;
    await sleep(1000);
  }
  throw new Error(`Servidor Next nao respondeu em ${baseURL}.`);
}

function spawnProcess(command, args) {
  return spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXTAUTH_URL: baseURL,
      PLAYWRIGHT_BASE_URL: baseURL,
    },
    windowsHide: true,
  });
}

async function killProcessTree(child) {
  if (!child || child.killed) return;

  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("close", resolve);
      killer.on("error", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main() {
  let server = null;
  const alreadyRunning = await isServerReady();

  if (!alreadyRunning) {
    server = spawnProcess("node", [
      "./node_modules/next/dist/bin/next",
      "start",
      "-H",
      parsedBaseURL.hostname,
      "-p",
      serverPort,
    ]);
    await waitForServer();
  }

  const test = isWindows
    ? spawnProcess("cmd.exe", ["/c", "node_modules\\.bin\\playwright.cmd", "test", ...process.argv.slice(2)])
    : spawnProcess("node_modules/.bin/playwright", ["test", ...process.argv.slice(2)]);

  const exitCode = await new Promise((resolve) => {
    test.on("close", resolve);
    test.on("error", () => resolve(1));
  });

  if (server) await killProcessTree(server);
  process.exit(exitCode ?? 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
