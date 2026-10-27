import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { inspectServerVideoDuration } from "../src/lib/server-video-duration";
import {
  MAX_PROFILE_VIDEO_DURATION_SECONDS,
  profileVideoDurationError,
  PROFILE_VIDEO_DURATION_ERROR,
  PROFILE_VIDEO_DURATION_UNKNOWN_ERROR,
} from "../src/lib/video-duration-policy";

function box(type: string, payload: Buffer) {
  const output = Buffer.alloc(8 + payload.length);
  output.writeUInt32BE(output.length, 0);
  output.write(type, 4, 4, "ascii");
  payload.copy(output, 8);
  return output;
}

function isoDurationHeader(seconds: number) {
  const timescale = 1_000;
  const header = Buffer.alloc(20);
  header.writeUInt8(0, 0);
  header.writeUInt32BE(timescale, 12);
  header.writeUInt32BE(seconds * timescale, 16);
  return header;
}

function isoVideo(seconds: number, trackSeconds = seconds) {
  const mvhd = box("mvhd", isoDurationHeader(seconds));
  const mdhd = box("mdhd", isoDurationHeader(trackSeconds));
  const trak = box("trak", box("mdia", mdhd));
  return Buffer.concat([box("ftyp", Buffer.from("isom0000")), box("moov", Buffer.concat([mvhd, trak]))]);
}

function webmVideo(seconds: number) {
  const scale = Buffer.from([0x0f, 0x42, 0x40]);
  const duration = Buffer.alloc(8);
  duration.writeDoubleBE(seconds * 1_000, 0);
  const infoPayload = Buffer.concat([
    Buffer.from([0x2a, 0xd7, 0xb1, 0x83]), scale,
    Buffer.from([0x44, 0x89, 0x88]), duration,
  ]);
  return Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80]),
    Buffer.from([0x15, 0x49, 0xa9, 0x66, 0x80 | infoPayload.length]),
    infoPayload,
  ]);
}

for (const seconds of [15, 29, 30]) {
  test(`${seconds} segundos sao permitidos`, () => {
    expect(profileVideoDurationError(seconds)).toBeNull();
    expect(inspectServerVideoDuration(isoVideo(seconds), "video/mp4")?.durationSeconds).toBe(seconds);
  });
}

for (const seconds of [31, 60]) {
  test(`${seconds} segundos sao rejeitados`, () => {
    expect(profileVideoDurationError(seconds)).toBe(PROFILE_VIDEO_DURATION_ERROR);
  });
}

test("MOV e WebM usam a duracao efetiva do container", () => {
  expect(inspectServerVideoDuration(isoVideo(30), "video/quicktime")?.durationSeconds).toBe(30);
  expect(inspectServerVideoDuration(webmVideo(29), "video/webm")?.durationSeconds).toBe(29);
});

test("arquivo invalido ou duracao desconhecida falha fechado", () => {
  expect(inspectServerVideoDuration(Buffer.from("invalid"), "video/mp4")).toBeNull();
  expect(profileVideoDurationError(null)).toBe(PROFILE_VIDEO_DURATION_UNKNOWN_ERROR);
});

test("metadado global manipulado nao esconde uma trilha acima do limite", () => {
  const inspected = inspectServerVideoDuration(isoVideo(30, 31), "video/mp4");
  expect(inspected?.durationSeconds).toBe(31);
  expect(profileVideoDurationError(inspected?.durationSeconds ?? null)).toBe(PROFILE_VIDEO_DURATION_ERROR);
});

test("caixas truncadas e tamanhos inconsistentes sao rejeitados", () => {
  const truncated = isoVideo(30).subarray(0, -3);
  expect(inspectServerVideoDuration(truncated, "video/mp4")).toBeNull();
  const inconsistent = Buffer.from(isoVideo(30));
  inconsistent.writeUInt32BE(inconsistent.length + 500, 0);
  expect(inspectServerVideoDuration(inconsistent, "video/mp4")).toBeNull();
});

test("backend aplica a regra somente aos novos videos de perfil", async () => {
  const source = await readFile("src/app/api/upload/route.ts", "utf8");
  expect(MAX_PROFILE_VIDEO_DURATION_SECONDS).toBe(30);
  expect(source).toContain('folder.startsWith("profile-videos")');
  expect(source).toContain("inspectServerVideoDuration(buffer, effectiveMime)");
  expect(source.indexOf("inspectServerVideoDuration(buffer, effectiveMime)")).toBeLessThan(source.indexOf("quarantineUpload({"));
});

test("cadastro e paineis compartilham a validacao de navegador", async () => {
  const files = await Promise.all([
    "src/app/(dashboard)/profissional/novo/page.tsx",
    "src/app/(dashboard)/profissional/fotos/page.tsx",
    "src/app/(dashboard)/profissional/configuracoes/page.tsx",
    "src/components/professional-dashboard/ProfessionalPostClient.tsx",
  ].map((path) => readFile(path, "utf8")));
  for (const source of files) expect(source).toContain("validateProfileVideoInBrowser");
});
