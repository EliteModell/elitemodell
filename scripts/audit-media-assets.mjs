import "dotenv/config";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  assertExternalEncryptedOutput,
  decryptBackupPayload,
  encryptBackupPayload,
  recoveryKeyFromEnvironment,
} from "./lib/elite-backup-crypto.mjs";

const outputArg = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
if (!outputArg) throw new Error("Informe --output=C:\\EliteModell-Backups\\...\\media-audit.json.embk.");
const output = assertExternalEncryptedOutput(outputArg);
const prisma = new PrismaClient();

async function storageRequest(url, key, requestPath, init = {}) {
  const response = await fetch(`${url}/storage/v1${requestPath}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Inventario de Storage falhou com HTTP ${response.status}.`);
  return response.json();
}

async function listBucketObjects(url, key, bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  while (true) {
    const page = await storageRequest(url, key, `/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    for (const item of page ?? []) {
      const storagePath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) objects.push({ bucket, path: storagePath, size: item.metadata?.size ?? null });
      else objects.push(...await listBucketObjects(url, key, bucket, storagePath));
    }
    if (!page || page.length < 1000) break;
    offset += page.length;
  }
  return objects;
}

async function storageInventory() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Credenciais administrativas do Supabase Storage ausentes.");
  const buckets = await storageRequest(url, key, "/bucket");
  const objects = [];
  for (const bucket of buckets) objects.push(...await listBucketObjects(url, key, bucket.name));
  return {
    buckets: buckets.map((bucket) => ({ name: bucket.name, public: Boolean(bucket.public) })),
    objects,
  };
}

function parseStorageUrl(value) {
  if (!value) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(base).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    return match ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]), url: value } : null;
  } catch {
    return null;
  }
}

async function legacyMediaReferences() {
  const [users, professionals, properties, stories] = await Promise.all([
    prisma.user.findMany({ where: { image: { not: null } }, select: { id: true, image: true } }),
    prisma.professional.findMany({ select: {
      id: true, userId: true, image: true, galleryUrls: true, presentationVideoUrl: true,
      docFrenteUrl: true, docVersoUrl: true, verificationUrl: true,
      photos: { select: { id: true, url: true } },
    } }),
    prisma.property.findMany({ select: { id: true, hostId: true, photos: { select: { id: true, url: true } } } }),
    prisma.story.findMany({ select: { id: true, userId: true, mediaUrl: true, thumbnail: true } }),
  ]);
  const references = [];
  const add = (value, type, id, owner) => {
    const parsed = parseStorageUrl(value);
    if (parsed) references.push({ ...parsed, type, id, owner });
  };
  for (const user of users) add(user.image, "USER_IMAGE", user.id, user.id);
  for (const professional of professionals) {
    add(professional.image, "PROFESSIONAL_IMAGE", professional.id, professional.userId);
    professional.galleryUrls.forEach((url, index) => add(url, `PROFESSIONAL_GALLERY_${index}`, professional.id, professional.userId));
    add(professional.presentationVideoUrl, "PROFESSIONAL_VIDEO", professional.id, professional.userId);
    add(professional.docFrenteUrl, "IDENTITY_DOCUMENT_FRONT", professional.id, professional.userId);
    add(professional.docVersoUrl, "IDENTITY_DOCUMENT_BACK", professional.id, professional.userId);
    add(professional.verificationUrl, "IDENTITY_VERIFICATION", professional.id, professional.userId);
    professional.photos.forEach((photo) => add(photo.url, "PROFESSIONAL_PHOTO", photo.id, professional.userId));
  }
  for (const property of properties) property.photos.forEach((photo) => add(photo.url, "PROPERTY_PHOTO", photo.id, property.hostId));
  for (const story of stories) {
    add(story.mediaUrl, "STORY", story.id, story.userId);
    add(story.thumbnail, "STORY_THUMBNAIL", story.id, story.userId);
  }
  return references;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    const value = String(row[field] ?? "UNKNOWN");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const [assets, storage, legacyReferences] = await Promise.all([
    prisma.uploadAsset.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        status: true,
        failureReason: true,
        malwareStatus: true,
        moderationStatus: true,
        visibility: true,
        sizeBytes: true,
        fileHash: true,
        storageProvider: true,
        quarantineBucket: true,
        quarantinePath: true,
        approvedBucket: true,
        approvedPath: true,
        uploadCompletedAt: true,
        ageIdentityStatus: true,
        consentStatus: true,
        adminReviewRequired: true,
        adminReviewStatus: true,
        takedownStatus: true,
        owner: { select: { id: true } },
      },
    }),
    storageInventory(),
    legacyMediaReferences(),
  ]);
  const visibility = new Map(storage.buckets.map((bucket) => [bucket.name, bucket.public]));

  const rows = assets.map((asset) => {
    const bucket = asset.approvedBucket ?? asset.quarantineBucket;
    const storagePath = asset.approvedPath ?? asset.quarantinePath;
    const publicObject = visibility.get(bucket) === true;
    const flags = [];
    if (asset.status === "APPROVED" && !["CLEAN", "APPROVED"].includes(asset.malwareStatus)) flags.push("APPROVED_BUT_PENDING_SCAN");
    if (asset.status === "APPROVED" && asset.moderationStatus !== "APPROVED") flags.push("APPROVED_BUT_PENDING_MODERATION");
    if (publicObject && (asset.visibility !== "PUBLIC" || asset.status !== "APPROVED")) flags.push("PUBLIC_SENSITIVE_MEDIA");
    if (!asset.owner?.id) flags.push("MISSING_OWNER");
    if (!asset.fileHash) flags.push("MISSING_HASH");
    return {
      id: asset.id,
      bucket,
      storagePath,
      status: asset.status,
      malwareStatus: asset.malwareStatus,
      moderationStatus: asset.moderationStatus,
      owner: asset.userId,
      visibility: asset.visibility,
      size: asset.sizeBytes,
      hash: asset.fileHash,
      public: publicObject,
      storageProvider: asset.storageProvider,
      gates: {
        uploadComplete: Boolean(asset.uploadCompletedAt),
        ageIdentityStatus: asset.ageIdentityStatus,
        consentStatus: asset.consentStatus,
        adminReviewRequired: asset.adminReviewRequired,
        adminReviewStatus: asset.adminReviewStatus,
        takedownStatus: asset.takedownStatus,
      },
      flags,
    };
  });
  const flagCounts = rows.flatMap((row) => row.flags).reduce((counts, flag) => {
    counts[flag] = (counts[flag] ?? 0) + 1;
    return counts;
  }, {});
  const referencedKeys = new Set([
    ...assets.flatMap((asset) => [
      `${asset.quarantineBucket}:${asset.quarantinePath}`,
      ...(asset.approvedBucket && asset.approvedPath ? [`${asset.approvedBucket}:${asset.approvedPath}`] : []),
    ]),
    ...legacyReferences.map((reference) => `${reference.bucket}:${reference.path}`),
  ]);
  const orphanObjects = storage.objects.filter((object) => !referencedKeys.has(`${object.bucket}:${object.path}`));
  const publicLegacyReferences = legacyReferences.filter((reference) => visibility.get(reference.bucket) === true);
  const summary = {
    assets: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.size, 0),
    byStatus: countBy(rows, "status"),
    byMalwareStatus: countBy(rows, "malwareStatus"),
    byModerationStatus: countBy(rows, "moderationStatus"),
    failClosedQuarantined: assets.filter((asset) => asset.failureReason?.startsWith("Fail-closed:")).length,
    buckets: Object.fromEntries(storage.buckets.map((bucket) => [bucket.name, bucket.public ? "PUBLIC" : "PRIVATE"])),
    storageObjects: storage.objects.length,
    legacyReferences: legacyReferences.length,
    publicPermanentLegacyReferences: publicLegacyReferences.length,
    orphanObjects: orphanObjects.length,
    flagCounts,
  };
  const report = Buffer.from(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY",
    objectsDeleted: 0,
    totals: summary,
    assets: rows,
    legacyReferences: legacyReferences.map((reference) => ({
      ...reference,
      public: visibility.get(reference.bucket) === true,
    })),
    orphanObjects,
  }, null, 2), "utf8");
  const key = recoveryKeyFromEnvironment();
  const encrypted = encryptBackupPayload(report, key);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, encrypted, { flag: "wx" });
  const verified = decryptBackupPayload(await readFile(output), key);
  if (sha256(verified) !== sha256(report)) throw new Error("Validacao imediata do relatorio criptografado falhou.");
  report.fill(0);
  verified.fill(0);
  key.fill(0);
  console.log(JSON.stringify({ output, encrypted: true, hashValidated: true, ...summary }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
