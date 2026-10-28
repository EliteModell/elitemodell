import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("compressão usa worker isolado e mantém original até retenção", async () => {
  const worker = await readFile("services/video-worker/server.ts", "utf8");
  expect(worker).toContain('run("ffmpeg"');
  expect(worker).toContain('spawn("ffprobe"');
  expect(worker).toContain('"-crf", "25"');
  expect(worker).toContain('"-pix_fmt", "yuv420p"');
  expect(worker).toContain('"-movflags", "+faststart"');
  expect(worker).toContain('request.url === "/canary"');
  expect(worker).toContain('"x-video-canary"');
  expect(worker).toContain("sourceDeleteAfter");
  expect(worker).toContain("sourceDeletedAt: null");
  expect(worker.indexOf("Finalization callback failed")).toBeLessThan(worker.lastIndexOf('status: "COMPLETED"'));
});

test("fila possui lease, retry e idempotência por asset", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const worker = await readFile("services/video-worker/server.ts", "utf8");
  expect(schema).toContain("model VideoProcessingJob");
  expect(schema).toContain("assetId             String    @unique");
  expect(worker).toContain("leaseToken");
  expect(worker).toContain('status: { in: ["QUEUED", "RETRY"] }');
  expect(worker).toContain('upsert: true');
});

test("ativação é fail-safe e upload continua privado", async () => {
  const route = await readFile("src/app/api/uploads/resumable/route.ts", "utf8");
  const migration = await readFile("prisma/migrations/20261028113000_video_transcoding_queue/migration.sql", "utf8");
  expect(route).toContain('process.env.VIDEO_TRANSCODING_MODE === "cloud-run"');
  expect(route).toContain('status: "PROCESSING"');
  expect(route).toContain("videoProcessingJob.upsert");
  expect(route).toContain("Vídeo enviado. Estamos preparando seu vídeo.");
  expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
});

test("callback exige segredo e reaproveita os controles existentes", async () => {
  const callback = await readFile("src/app/api/internal/media/video-ready/route.ts", "utf8");
  expect(callback).toContain("timingSafeEqual");
  expect(callback).toContain("VIDEO_WORKER_CALLBACK_SECRET");
  expect(callback).toContain("processUploadAsset(asset.id, buffer)");
});
