import { createServer } from "node:http";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

type ScanResult = { status: "CLEAN" | "INFECTED" | "ERROR"; provider: "CLAMAV"; version?: string; reason?: string };

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 8080);
const maxBytes = Number(process.env.SCANNER_MAX_FILE_BYTES || 250 * 1024 * 1024);
const scanTimeoutMs = Number(process.env.SCANNER_TIMEOUT_MS || 5 * 60_000);
const signatureMaxAgeHours = Number(process.env.CLAMAV_SIGNATURE_MAX_AGE_HOURS || 48);

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function json(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body too large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as { assetId?: unknown };
}

async function signatureTimestamp() {
  const candidates = ["/var/lib/clamav/daily.cvd", "/var/lib/clamav/daily.cld", "/var/lib/clamav/main.cvd", "/var/lib/clamav/main.cld"];
  const stats = await Promise.all(candidates.map((path) => fs.stat(path).catch(() => null)));
  const times = stats.filter(Boolean).map((stat) => stat!.mtimeMs);
  if (!times.length) throw new Error("ClamAV signature database is missing");
  return Math.max(...times);
}

async function assertFreshSignatures() {
  const updatedAt = await signatureTimestamp();
  const ageMs = Date.now() - updatedAt;
  if (ageMs < 0 || ageMs > signatureMaxAgeHours * 3_600_000) {
    throw new Error("ClamAV signatures are stale");
  }
}

async function assertClamdAvailable() {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 3310 });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("ClamAV health check timed out"));
    }, 2_000);
    let response = "";
    const fail = (cause: Error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(cause);
    };
    socket.on("connect", () => socket.end("PING\n"));
    socket.on("data", (chunk) => { response += chunk.toString("utf8"); });
    socket.on("error", () => fail(new Error("ClamAV is unavailable")));
    socket.on("end", () => {
      clearTimeout(timer);
      if (response.trim() === "PONG") resolve();
      else reject(new Error("ClamAV health response is invalid"));
    });
  });
}

async function downloadToTemporaryFile(asset: { storageProvider: string; quarantineBucket: string; quarantinePath: string; sizeBytes: number }) {
  if (asset.sizeBytes <= 0 || asset.sizeBytes > maxBytes) throw new Error("Asset exceeds scanner size policy");
  if (asset.storageProvider !== "SUPABASE") throw new Error(`Unsupported storage provider: ${asset.storageProvider}`);
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await supabase.storage.from(asset.quarantineBucket).createSignedUrl(asset.quarantinePath, 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error("Unable to authorize private asset download");
  const response = await fetch(signed.data.signedUrl, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Private asset download failed: HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("Asset exceeds scanner size policy");
  const path = join(tmpdir(), `elite-scan-${randomUUID()}`);
  let streamedBytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      streamedBytes += chunk.length;
      callback(streamedBytes > maxBytes ? new Error("Asset exceeds scanner size policy") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body as never), limiter, createWriteStream(path, { flags: "wx", mode: 0o600 }));
  } catch (cause) {
    await fs.rm(path, { force: true }).catch(() => undefined);
    throw cause;
  }
  const stat = await fs.stat(path);
  if (stat.size !== asset.sizeBytes || stat.size > maxBytes) {
    await fs.rm(path, { force: true });
    throw new Error("Downloaded asset size mismatch");
  }
  return path;
}

async function scanFile(path: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 3310 });
    const timer = setTimeout(() => finish({ status: "ERROR", provider: "CLAMAV", reason: "Scan timeout" }), scanTimeoutMs);
    let response = "";
    let settled = false;
    const finish = (result: ScanResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    socket.on("error", () => finish({ status: "ERROR", provider: "CLAMAV", reason: "ClamAV unavailable" }));
    socket.on("data", (chunk) => { response += chunk.toString("utf8"); });
    socket.on("end", () => {
      if (/\bOK\b/.test(response)) return finish({ status: "CLEAN", provider: "CLAMAV" });
      if (/\bFOUND\b/.test(response)) return finish({ status: "INFECTED", provider: "CLAMAV", reason: "Malware detected" });
      finish({ status: "ERROR", provider: "CLAMAV", reason: "Invalid scanner response" });
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const stream = createReadStream(path, { highWaterMark: 64 * 1024 });
      stream.on("data", (rawChunk) => {
        const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      });
      stream.on("end", () => socket.end(Buffer.alloc(4)));
      stream.on("error", () => finish({ status: "ERROR", provider: "CLAMAV", reason: "Temporary file read failed" }));
    });
  });
}

async function processAsset(assetId: string) {
  const requestStartedAt = Date.now();
  const now = new Date();
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + 10 * 60_000);
  const claim = await prisma.malwareScanJob.updateMany({
    where: {
      assetId, availableAt: { lte: now }, completedAt: null,
      OR: [
        { status: { in: ["QUEUED", "RETRY"] }, leaseExpiresAt: null },
        { status: "PROCESSING", leaseExpiresAt: { lt: now } },
      ],
    },
    data: { status: "PROCESSING", leaseToken, leaseExpiresAt, attempts: { increment: 1 }, lastError: null },
  });
  if (claim.count !== 1) {
    const existing = await prisma.malwareScanJob.findUnique({
      where: { assetId },
      select: { status: true, availableAt: true, leaseExpiresAt: true, completedAt: true },
    });
    if (!existing) throw new Error("Malware scan job not found");
    if (existing.completedAt || ["COMPLETED", "FAILED"].includes(existing.status)) {
      return { disposition: "terminal_duplicate" as const, retryAfterSeconds: null };
    }
    const retryAt = [existing.availableAt, existing.leaseExpiresAt]
      .filter((value): value is Date => Boolean(value))
      .reduce((latest, value) => value > latest ? value : latest, now);
    return {
      disposition: "deferred" as const,
      retryAfterSeconds: Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 1_000)),
    };
  }

  const job = await prisma.malwareScanJob.findUniqueOrThrow({ where: { assetId }, include: { asset: true } });
  let temporaryPath: string | null = null;
  let result: ScanResult;
  try {
    if (!["QUARANTINED", "PENDING"].includes(job.asset.status) || job.asset.malwareStatus === "CLEAN" || job.asset.malwareStatus === "INFECTED") {
      await prisma.malwareScanJob.updateMany({
        where: { assetId, leaseToken, status: "PROCESSING" },
        data: { status: "COMPLETED", completedAt: new Date(), leaseToken: null, leaseExpiresAt: null },
      });
      return { disposition: "terminal_duplicate" as const, retryAfterSeconds: null };
    }
    await assertFreshSignatures();
    temporaryPath = await downloadToTemporaryFile(job.asset);
    result = await scanFile(temporaryPath);
  } catch (cause) {
    result = { status: "ERROR", provider: "CLAMAV", reason: cause instanceof Error ? cause.message : "Scanner failure" };
  } finally {
    if (temporaryPath) await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }

  const delaySeconds = Math.min(3_600, 30 * 2 ** Math.max(0, job.attempts - 1));
  const exhausted = result.status === "ERROR" && job.attempts >= job.maxAttempts;
  const leaseOwned = await prisma.$transaction(async (tx) => {
    const jobUpdate = await tx.malwareScanJob.updateMany({
      where: { assetId, leaseToken, status: "PROCESSING" },
      data: result.status === "ERROR"
        ? {
            status: exhausted ? "FAILED" : "RETRY",
            availableAt: exhausted ? job.availableAt : new Date(Date.now() + delaySeconds * 1_000),
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: result.reason?.slice(0, 2_000) || "Scanner failure",
          }
        : {
            status: "COMPLETED",
            completedAt: new Date(),
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: null,
          },
    });
    if (jobUpdate.count !== 1) return false;
    if (result.status === "CLEAN") {
      await tx.uploadAsset.update({ where: { id: assetId }, data: { status: "PENDING_MODERATION", malwareStatus: "CLEAN", malwareProvider: "CLAMAV", malwareResult: result, scanAttempts: { increment: 1 }, failureReason: null, lastProcessedAt: new Date() } });
    } else if (result.status === "INFECTED") {
      await tx.uploadAsset.update({ where: { id: assetId }, data: { status: "REJECTED", malwareStatus: "INFECTED", malwareProvider: "CLAMAV", malwareResult: result, scanAttempts: { increment: 1 }, rejectedAt: new Date(), failureReason: result.reason, lastProcessedAt: new Date() } });
    } else {
      await tx.uploadAsset.update({ where: { id: assetId }, data: { status: "QUARANTINED", malwareStatus: "ERROR", malwareProvider: "CLAMAV", malwareResult: result, scanAttempts: { increment: 1 }, failureReason: result.reason, lastProcessedAt: new Date() } });
    }
    return true;
  });
  const durationMs = Date.now() - requestStartedAt;
  if (!leaseOwned) {
    console.warn(JSON.stringify({ event: "scan_lease_lost", assetId, durationMs }));
    return { disposition: "deferred" as const, retryAfterSeconds: 30 };
  }
  const disposition = result.status === "ERROR" ? (exhausted ? "failed" : "retry") : "completed";
  console.log(JSON.stringify({ event: "scan_finished", assetId, disposition, status: result.status, attempt: job.attempts, durationMs }));
  return {
    disposition,
    status: result.status,
    retryAfterSeconds: disposition === "retry" ? delaySeconds : null,
  };
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      await assertFreshSignatures();
      await assertClamdAvailable();
      return json(response, 200, { ok: true });
    }
    if (request.method !== "POST" || request.url !== "/tasks/scan") return json(response, 404, { error: "not_found" });
    if (process.env.REQUIRE_CLOUD_TASK_HEADER !== "false" && !request.headers["x-cloudtasks-taskname"]) {
      return json(response, 403, { error: "cloud_task_required" });
    }
    const body = await readJson(request);
    if (typeof body.assetId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(body.assetId)) {
      return json(response, 400, { error: "invalid_asset_id" });
    }
    const result = await processAsset(body.assetId);
    if (result.disposition === "retry" || result.disposition === "deferred") {
      response.setHeader("retry-after", String(result.retryAfterSeconds || 30));
      return json(response, 503, result);
    }
    return json(response, 200, result);
  } catch (cause) {
    console.error(JSON.stringify({ event: "scan_request_failed", reason: cause instanceof Error ? cause.message : "unknown" }));
    return json(response, 500, { error: "scan_failed" });
  }
});

server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "worker_ready", port })));

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => server.close(() => prisma.$disconnect().finally(() => process.exit(0))));
}
