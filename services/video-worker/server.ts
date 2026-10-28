import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 8080);
const maxBytes = 500 * 1024 * 1024;
const maxDurationSeconds = 30.5;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function metadataAccessToken() {
  const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
    headers: { "metadata-flavor": "Google" }, signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Metadata token failed: HTTP ${response.status}`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Metadata token response is invalid");
  return body.access_token;
}

async function dispatchQueuedJobs(limit = 50) {
  const cleanupClient = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const expiredSources = await prisma.videoProcessingJob.findMany({
    where: { status: "COMPLETED", completedAt: { not: null }, sourceDeleteAfter: { lte: new Date() }, sourceDeletedAt: null },
    select: { id: true, sourceBucket: true, sourcePath: true, outputPath: true }, take: 50,
  });
  for (const source of expiredSources) {
    if (!source.outputPath || source.outputPath === source.sourcePath) continue;
    const removed = await cleanupClient.storage.from(source.sourceBucket).remove([source.sourcePath]);
    if (!removed.error) await prisma.videoProcessingJob.update({ where: { id: source.id }, data: { sourceDeletedAt: new Date() } });
  }
  const jobs = await prisma.videoProcessingJob.findMany({
    where: { status: { in: ["QUEUED", "RETRY"] }, availableAt: { lte: new Date() }, completedAt: null },
    select: { id: true, assetId: true }, orderBy: { createdAt: "asc" }, take: Math.max(1, Math.min(limit, 100)),
  });
  if (!jobs.length) return { selected: 0, dispatched: 0, failed: 0 };
  const project = required("CLOUD_TASKS_PROJECT");
  const location = required("CLOUD_TASKS_LOCATION");
  const queue = required("VIDEO_CLOUD_TASKS_QUEUE");
  const parent = `projects/${project}/locations/${location}/queues/${queue}`;
  const workerUrl = required("VIDEO_WORKER_URL").replace(/\/$/, "");
  const serviceAccountEmail = required("CLOUD_TASKS_OIDC_SERVICE_ACCOUNT");
  const token = await metadataAccessToken();
  let dispatched = 0;
  let failed = 0;
  for (const job of jobs) {
    const task = {
      name: `${parent}/tasks/video-${job.id}`,
      httpRequest: {
        httpMethod: "POST", url: `${workerUrl}/tasks/transcode`,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify({ assetId: job.assetId })).toString("base64"),
        oidcToken: { serviceAccountEmail, audience: workerUrl },
      },
    };
    const response = await fetch(`https://cloudtasks.googleapis.com/v2/${parent}/tasks`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ task }), signal: AbortSignal.timeout(10_000),
    });
    if (response.ok || response.status === 409) dispatched += 1;
    else failed += 1;
  }
  return { selected: jobs.length, dispatched, failed };
}

function json(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readAssetId(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body too large");
    chunks.push(Buffer.from(chunk));
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { assetId?: unknown };
  if (typeof body.assetId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(body.assetId)) throw new Error("Invalid asset id");
  return body.assetId;
}

function run(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(stderr) : reject(new Error(`${command} failed (${code}): ${stderr.slice(-2000)}`)));
  });
}

function transcodeArgs(source: string, output: string) {
  return ["-nostdin", "-y", "-i", source, "-map_metadata", "-1", "-vf", "scale=w='min(iw,1920)':h='min(ih,1080)':force_original_aspect_ratio=decrease:force_divisible_by=2", "-c:v", "libx264", "-preset", "medium", "-crf", "25", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1", "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-movflags", "+faststart", "-t", "30", output];
}

async function runSyntheticCanary(format: "mov" | "mp4" | "webm") {
  const directory = join(tmpdir(), `elite-video-canary-${randomUUID()}`);
  const source = join(directory, `source.${format}`);
  const output = join(directory, "optimized.mp4");
  await mkdir(directory, { recursive: false });
  const startedAt = Date.now();
  try {
    const common = ["-nostdin", "-y", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=5", "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000:duration=5", "-shortest"];
    const codec = format === "mov"
      ? ["-c:v", "prores_ks", "-profile:v", "2", "-c:a", "pcm_s16le"]
      : format === "webm"
        ? ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-b:v", "20M", "-c:a", "libopus"]
        : ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "10", "-c:a", "aac", "-b:a", "256k"];
    await run("ffmpeg", [...common, ...codec, source]);
    const input = await probe(source);
    const sourceInfo = await stat(source);
    await run("ffmpeg", transcodeArgs(source, output));
    const optimized = await probe(output);
    const outputInfo = await stat(output);
    const qualityLog = await run("ffmpeg", ["-nostdin", "-i", source, "-i", output, "-lavfi", "[0:v]scale=w='min(iw,1920)':h='min(ih,1080)':force_original_aspect_ratio=decrease:force_divisible_by=2[ref];[ref][1:v]ssim", "-f", "null", "-"]);
    const ssim = Number(/All:([0-9.]+)/.exec(qualityLog)?.[1] || 0);
    return {
      format,
      sourceBytes: sourceInfo.size,
      optimizedBytes: outputInfo.size,
      reductionPercent: Number(((1 - outputInfo.size / sourceInfo.size) * 100).toFixed(2)),
      source: input,
      optimized,
      ssim,
      processingMs: Date.now() - startedAt,
    };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function probe(path: string) {
  const child = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", path]);
  const chunks: Buffer[] = [];
  const errors: Buffer[] = [];
  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
  const code = await new Promise<number | null>((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  if (code !== 0) throw new Error(`ffprobe failed: ${Buffer.concat(errors).toString().slice(-1000)}`);
  const result = JSON.parse(Buffer.concat(chunks).toString()) as { format?: { duration?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number }> };
  const video = result.streams?.find((stream) => stream.codec_type === "video");
  const duration = Number(result.format?.duration);
  if (!video?.width || !video.height || !Number.isFinite(duration) || duration <= 0 || duration > maxDurationSeconds) throw new Error("Invalid video dimensions or duration");
  return { duration, width: video.width, height: video.height };
}

async function download(bucket: string, objectPath: string, expectedBytes: number, output: string) {
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300);
  if (signed.error || !signed.data?.signedUrl) throw new Error("Unable to authorize source download");
  const response = await fetch(signed.data.signedUrl, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) throw new Error(`Source download failed: HTTP ${response.status}`);
  let received = 0;
  const limiter = new Transform({ transform(chunk, _encoding, callback) { received += chunk.length; callback(received > maxBytes ? new Error("Source exceeds limit") : null, chunk); } });
  await pipeline(Readable.fromWeb(response.body as never), limiter, createWriteStream(output, { flags: "wx", mode: 0o600 }));
  const info = await stat(output);
  if (info.size !== expectedBytes) throw new Error("Source size mismatch");
}

async function processAsset(assetId: string) {
  const now = new Date();
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + 15 * 60_000);
  const claimed = await prisma.videoProcessingJob.updateMany({
    where: { assetId, completedAt: null, availableAt: { lte: now }, OR: [{ status: { in: ["QUEUED", "RETRY"] }, leaseExpiresAt: null }, { status: "PROCESSING", leaseExpiresAt: { lt: now } }] },
    data: { status: "PROCESSING", attempts: { increment: 1 }, leaseToken, leaseExpiresAt, lastError: null },
  });
  if (claimed.count !== 1) return { disposition: "duplicate_or_deferred" };
  const job = await prisma.videoProcessingJob.findUniqueOrThrow({ where: { assetId }, include: { asset: true } });
  const directory = join(tmpdir(), `elite-video-${randomUUID()}`);
  const source = join(directory, "source");
  const output = join(directory, "optimized.mp4");
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await mkdir(directory, { recursive: false });
    await download(job.sourceBucket, job.sourcePath, job.sourceSizeBytes, source);
    const input = await probe(source);
    await run("ffmpeg", transcodeArgs(source, output));
    const optimized = await probe(output);
    const outputInfo = await stat(output);
    if (outputInfo.size <= 0 || outputInfo.size > maxBytes) throw new Error("Optimized output is invalid");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(output)) hash.update(chunk);
    const outputHash = hash.digest("hex");
    const outputPath = `_optimized/${job.asset.userId}/${assetId}.mp4`;
    const bytes = await import("node:fs/promises").then(({ readFile }) => readFile(output));
    const uploaded = await supabase.storage.from(job.sourceBucket).upload(outputPath, bytes, { contentType: "video/mp4", upsert: true, cacheControl: "31536000" });
    if (uploaded.error) throw uploaded.error;
    const retentionHours = Math.max(1, Number(process.env.VIDEO_SOURCE_RETENTION_HOURS || 24));
    const sourceDeleteAfter = new Date(Date.now() + retentionHours * 3_600_000);
    const owned = await prisma.$transaction(async (tx) => {
      const update = await tx.videoProcessingJob.updateMany({ where: { assetId, leaseToken, status: "PROCESSING" }, data: { outputBucket: job.sourceBucket, outputPath, outputSizeBytes: outputInfo.size, outputHash, outputWidth: optimized.width, outputHeight: optimized.height, outputDurationMs: Math.round(optimized.duration * 1000), outputCodec: "h264+aac", sourceDeleteAfter } });
      if (update.count !== 1) return false;
      await tx.uploadAsset.update({ where: { id: assetId }, data: { detectedMimeType: "video/mp4", extension: "mp4", sizeBytes: outputInfo.size, fileHash: outputHash, quarantineBucket: job.sourceBucket, quarantinePath: outputPath, status: "PROCESSING", lastProcessedAt: new Date(), failureReason: null } });
      return true;
    });
    if (!owned) {
      await supabase.storage.from(job.sourceBucket).remove([outputPath]);
      return { disposition: "lease_lost" };
    }
    const callback = await fetch(`${required("APP_BASE_URL").replace(/\/$/, "")}/api/internal/media/video-ready`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${required("VIDEO_WORKER_CALLBACK_SECRET")}` }, body: JSON.stringify({ assetId }), signal: AbortSignal.timeout(300_000) });
    if (!callback.ok) throw new Error(`Finalization callback failed: HTTP ${callback.status}`);
    await prisma.videoProcessingJob.updateMany({
      where: { assetId, leaseToken, status: "PROCESSING" },
      data: { status: "COMPLETED", completedAt: new Date(), leaseToken: null, leaseExpiresAt: null },
    });
    return { disposition: "completed", sourceBytes: job.sourceSizeBytes, outputBytes: outputInfo.size, sourceWidth: input.width, sourceHeight: input.height, width: optimized.width, height: optimized.height };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "Video processing failed";
    const exhausted = job.attempts >= job.maxAttempts;
    const delay = Math.min(3600, 60 * 2 ** Math.max(0, job.attempts - 1));
    await prisma.videoProcessingJob.updateMany({ where: { assetId, leaseToken, status: "PROCESSING" }, data: { status: exhausted ? "FAILED" : "RETRY", availableAt: new Date(Date.now() + delay * 1000), leaseToken: null, leaseExpiresAt: null, lastError: reason.slice(0, 2000) } });
    await prisma.uploadAsset.update({ where: { id: assetId }, data: { status: "PROCESSING", failureReason: exhausted ? "Não foi possível preparar o vídeo. O original foi preservado para uma nova tentativa." : null } }).catch(() => undefined);
    return { disposition: exhausted ? "failed" : "retry", retryAfterSeconds: delay };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/canary") {
      if (request.headers["x-video-canary"] !== "true") return json(response, 403, { error: "canary_header_required" });
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const format = (JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as { format?: unknown }).format;
      if (format !== "mov" && format !== "mp4" && format !== "webm") return json(response, 400, { error: "invalid_canary_format" });
      const result = await runSyntheticCanary(format);
      console.log(JSON.stringify({ event: "video_canary_result", ...result }));
      return json(response, 200, result);
    }
    if (request.method === "POST" && request.url === "/tasks/dispatch") {
      if (process.env.REQUIRE_CLOUD_SCHEDULER_HEADER !== "false" && request.headers["x-cloudscheduler"] !== "true") return json(response, 403, { error: "cloud_scheduler_required" });
      const result = await dispatchQueuedJobs();
      return json(response, result.failed ? 503 : 200, result);
    }
    if (request.method !== "POST" || request.url !== "/tasks/transcode") return json(response, 404, { error: "not_found" });
    if (process.env.REQUIRE_CLOUD_TASK_HEADER !== "false" && !request.headers["x-cloudtasks-taskname"]) return json(response, 403, { error: "cloud_task_required" });
    const result = await processAsset(await readAssetId(request));
    if (result.disposition === "retry") { response.setHeader("retry-after", String(result.retryAfterSeconds)); return json(response, 503, result); }
    return json(response, 200, result);
  } catch (cause) {
    console.error(JSON.stringify({ event: "video_worker_failed", reason: cause instanceof Error ? cause.message : "unknown" }));
    return json(response, 500, { error: "video_processing_failed" });
  }
});

server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "video_worker_ready", port })));
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => server.close(() => prisma.$disconnect().finally(() => process.exit(0))));
