import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

async function runScenario(sizeMb, concurrency) {
  if (global.gc) global.gc();
  const before = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const started = performance.now();
  let ready = 0;
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  const jobs = Array.from({ length: concurrency }, async (_, index) => {
    const multipartBody = new Uint8Array(sizeMb * 1024 * 1024);
    multipartBody[0] = index;
    const routeBuffer = Buffer.from(multipartBody);
    ready += 1;
    if (ready === concurrency) release();
    await barrier;
    return createHash("sha256").update(routeBuffer).digest("hex");
  });
  while (ready < concurrency) await new Promise((resolve) => setImmediate(resolve));
  const peak = process.memoryUsage();
  const hashes = await Promise.all(jobs);
  const elapsedMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuBefore);
  return {
    fileSizeMb: sizeMb,
    concurrency,
    inputMegabytes: sizeMb * concurrency,
    approximateLiveCopiesMegabytes: sizeMb * concurrency * 2,
    rssDeltaMegabytes: Number(((peak.rss - before.rss) / 1024 / 1024).toFixed(2)),
    externalMemoryDeltaMegabytes: Number(((peak.external - before.external) / 1024 / 1024).toFixed(2)),
    elapsedMs: Number(elapsedMs.toFixed(2)),
    cpuMs: Number(((cpu.user + cpu.system) / 1000).toFixed(2)),
    effectiveHashingMegabytesPerSecond: Number(((sizeMb * concurrency) / (elapsedMs / 1000)).toFixed(2)),
    uniqueHashes: new Set(hashes).size,
  };
}

const sizeArgument = process.argv.find((argument) => argument.startsWith("--size="));
const concurrencyArgument = process.argv.find((argument) => argument.startsWith("--concurrency="));

if (sizeArgument && concurrencyArgument) {
  const result = await runScenario(Number(sizeArgument.slice(7)), Number(concurrencyArgument.slice(14)));
  console.log(JSON.stringify(result));
} else {
  const results = [];
  for (const sizeMb of [1, 5, 10]) {
    for (const concurrency of [10, 25, 50]) {
      const child = spawnSync(process.execPath, ["--expose-gc", import.meta.filename, `--size=${sizeMb}`, `--concurrency=${concurrency}`], {
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      if (child.status !== 0) throw new Error(child.stderr || `Cenário ${sizeMb}MB x ${concurrency} falhou.`);
      results.push(JSON.parse(child.stdout));
    }
  }
  console.log(JSON.stringify({
    environment: "LOCAL_SYNTHETIC_MEMORY_AND_SHA256_NO_STORAGE_OR_EXTERNAL_PROVIDER",
    note: "Cada cenário usa um processo limpo. É um limite inferior: multipart/framework/rede não estão incluídos.",
    results,
  }, null, 2));
}
