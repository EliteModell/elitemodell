import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const manifestFile = ".diagnostics/legacy-media-inventory.json";
const args = new Map(process.argv.slice(2).map((arg, index, all) => (
  arg.startsWith("--") ? [arg, all[index + 1]?.startsWith("--") ? true : all[index + 1] ?? true] : [arg, true]
)));
const mode = args.has("--stage") ? "STAGE" : args.has("--finalize") ? "FINALIZE" : args.has("--rollback") ? "ROLLBACK" : "PLAN";
const quarantineBucket = process.env.UPLOAD_QUARANTINE_BUCKET?.trim() || "upload-quarantine";

function mimeFromPath(path) {
  const extension = path.split(".").pop()?.toLowerCase() || "bin";
  const types = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
  };
  const mime = types[extension] || "application/octet-stream";
  return {
    extension,
    mime,
    category: mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "document",
  };
}

function storageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Storage administrativo nao configurado.");
  return { url, key };
}

async function storageJson(path, init = {}) {
  const { url, key } = storageConfig();
  const response = await fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Storage HTTP ${response.status}.`);
  return payload;
}

async function ensurePrivateBucket(bucket) {
  const buckets = await storageJson("/bucket");
  const existing = buckets.find((item) => item.name === bucket);
  if (existing?.public) throw new Error(`Bucket ${bucket} precisa ser privado.`);
  if (!existing) {
    await storageJson("/bucket", {
      method: "POST",
      body: JSON.stringify({ id: bucket, name: bucket, public: false }),
    });
  }
}

async function downloadObject(bucket, path) {
  const { url, key } = storageConfig();
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  );
  if (!response.ok) throw new Error(`Falha ao baixar ${bucket}/${path}: HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadObject(bucket, path, buffer, mime, upsert = false) {
  const { url, key } = storageConfig();
  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": mime,
        "x-upsert": upsert ? "true" : "false",
      },
      body: buffer,
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Falha ao enviar ${bucket}/${path}: HTTP ${response.status}.`);
  }
}

async function removeObject(bucket, path) {
  await storageJson(`/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: [path] }),
  });
}

async function sourceSnapshot(item) {
  if (item.referenceType === "ProfessionalPhoto") {
    return prisma.professionalPhoto.findUnique({ where: { id: item.referenceId } });
  }
  if (item.referenceType === "PropertyPhoto") {
    return prisma.propertyPhoto.findUnique({ where: { id: item.referenceId } });
  }
  if (item.referenceType === "Story") {
    return prisma.story.findUnique({ where: { id: item.referenceId } });
  }
  return { sourceUrl: item.sourceUrl };
}

async function restrictReference(item, assetId) {
  if (item.referenceType === "User" && item.field === "image") {
    await prisma.user.updateMany({ where: { id: item.referenceId, image: item.sourceUrl }, data: { image: null } });
  } else if (item.referenceType === "Professional") {
    if (item.field.startsWith("galleryUrls[")) {
      const professional = await prisma.professional.findUnique({ where: { id: item.referenceId }, select: { galleryUrls: true } });
      if (professional) {
        await prisma.professional.update({
          where: { id: item.referenceId },
          data: { galleryUrls: professional.galleryUrls.filter((url) => url !== item.sourceUrl) },
        });
      }
    } else {
      const allowed = ["image", "presentationVideoUrl", "docFrenteUrl", "docVersoUrl", "verificationUrl"];
      if (!allowed.includes(item.field)) throw new Error(`Campo profissional nao suportado: ${item.field}`);
      await prisma.professional.update({
        where: { id: item.referenceId },
        data: { [item.field]: null },
      });
    }
  } else if (item.referenceType === "ProfessionalPhoto") {
    await prisma.professionalPhoto.deleteMany({ where: { id: item.referenceId, url: item.sourceUrl } });
  } else if (item.referenceType === "PropertyPhoto") {
    await prisma.propertyPhoto.deleteMany({ where: { id: item.referenceId, url: item.sourceUrl } });
  } else if (item.referenceType === "Story") {
    if (item.field === "thumbnail") {
      await prisma.story.updateMany({ where: { id: item.referenceId }, data: { thumbnail: null } });
    } else {
      await prisma.story.updateMany({ where: { id: item.referenceId }, data: { mediaUrl: `asset:${assetId}` } });
    }
  } else {
    throw new Error(`Referencia nao suportada: ${item.referenceType}.${item.field}`);
  }
}

async function restoreReference(item, url) {
  const snapshot = item.snapshot && typeof item.snapshot === "object" ? item.snapshot : {};
  if (item.referenceType === "User") {
    await prisma.user.update({ where: { id: item.referenceId }, data: { image: url } });
  } else if (item.referenceType === "Professional") {
    if (item.field.startsWith("galleryUrls[")) {
      const professional = await prisma.professional.findUniqueOrThrow({ where: { id: item.referenceId }, select: { galleryUrls: true } });
      if (!professional.galleryUrls.includes(url)) {
        await prisma.professional.update({ where: { id: item.referenceId }, data: { galleryUrls: [...professional.galleryUrls, url] } });
      }
    } else {
      await prisma.professional.update({ where: { id: item.referenceId }, data: { [item.field]: url } });
    }
  } else if (item.referenceType === "ProfessionalPhoto") {
    await prisma.professionalPhoto.upsert({
      where: { id: item.referenceId },
      create: {
        id: item.referenceId,
        professionalId: snapshot.professionalId,
        url,
        caption: snapshot.caption ?? null,
        order: snapshot.order ?? 0,
        cover: snapshot.cover ?? false,
      },
      update: { url },
    });
  } else if (item.referenceType === "PropertyPhoto") {
    await prisma.propertyPhoto.upsert({
      where: { id: item.referenceId },
      create: {
        id: item.referenceId,
        propertyId: snapshot.propertyId,
        url,
        caption: snapshot.caption ?? null,
        order: snapshot.order ?? 0,
      },
      update: { url },
    });
  } else if (item.referenceType === "Story") {
    await prisma.story.updateMany({
      where: { id: item.referenceId },
      data: item.field === "thumbnail" ? { thumbnail: url } : { mediaUrl: url },
    });
  }
}

async function manifestAndHash() {
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const candidates = manifest.references.filter((item) => item.proposedAction !== "VERIFY_PRIVATE_ACCESS");
  const canonical = JSON.stringify(candidates.map((item) => ({
    referenceType: item.referenceType,
    referenceId: item.referenceId,
    field: item.field,
    sourceBucket: item.bucket,
    sourcePath: item.path,
    sourceUrl: item.url,
    ownerId: item.ownerId,
    visibility: item.visibility,
    action: item.proposedAction,
  })));
  return { manifest, candidates, manifestHash: createHash("sha256").update(canonical).digest("hex") };
}

function requireApproval(manifestHash) {
  const approved = String(args.get("--approval") || process.env.LEGACY_MEDIA_MIGRATION_APPROVAL || "");
  const approvedById = String(args.get("--approved-by") || "");
  const reason = String(args.get("--reason") || "");
  if (approved !== manifestHash || !approvedById || reason.length < 12) {
    throw new Error(`Aprovacao invalida. Use --approval ${manifestHash} --approved-by <adminId> --reason "<justificativa>".`);
  }
  return { approvedById, reason };
}

async function plan() {
  const { candidates, manifestHash } = await manifestAndHash();
  console.log(JSON.stringify({
    mode: "PLAN_ONLY",
    manifestHash,
    candidates: candidates.length,
    command: `node scripts/migrate-legacy-media.mjs --stage --approval ${manifestHash} --approved-by <adminId> --reason "<justificativa>"`,
  }, null, 2));
}

async function stage() {
  const { candidates, manifestHash } = await manifestAndHash();
  const approval = requireApproval(manifestHash);
  await ensurePrivateBucket(quarantineBucket);
  const job = await prisma.legacyMediaMigrationJob.upsert({
    where: { manifestHash },
    create: {
      manifestHash,
      totalItems: candidates.length,
      status: "PROCESSING",
      mode: "STAGE",
      approvedById: approval.approvedById,
      approvalReason: approval.reason,
      startedAt: new Date(),
      items: {
        create: candidates.map((item) => ({
          referenceType: item.referenceType,
          referenceId: item.referenceId,
          field: item.field,
          ownerId: item.ownerId,
          sourceBucket: item.bucket,
          sourcePath: item.path,
          sourceUrl: item.url,
          sourceVisibility: item.visibility,
          action: item.proposedAction,
        })),
      },
    },
    update: {
      status: "PROCESSING",
      mode: "STAGE",
      approvedById: approval.approvedById,
      approvalReason: approval.reason,
      startedAt: new Date(),
    },
  });
  const items = await prisma.legacyMediaMigrationItem.findMany({
    where: { jobId: job.id, status: { in: ["PLANNED", "FAILED"] } },
    orderBy: { createdAt: "asc" },
  });

  for (const item of items) {
    try {
      const source = await downloadObject(item.sourceBucket, item.sourcePath);
      const fileHash = createHash("sha256").update(source).digest("hex");
      const assetId = item.targetAssetId || randomUUID();
      const { extension, mime, category } = mimeFromPath(item.sourcePath);
      const targetPath = `${item.ownerId || "unowned"}/legacy/${assetId}.${extension}`;
      await uploadObject(quarantineBucket, targetPath, source, mime, true);
      const verified = await downloadObject(quarantineBucket, targetPath);
      if (createHash("sha256").update(verified).digest("hex") !== fileHash) {
        throw new Error("Hash da copia em quarentena diverge da origem.");
      }
      const snapshot = await sourceSnapshot(item);
      await prisma.uploadAsset.upsert({
        where: { id: assetId },
        create: {
          id: assetId,
          userId: item.ownerId,
          originalName: item.sourcePath.split("/").pop() || `legacy.${extension}`,
          folder: `legacy/${item.referenceType.toLowerCase()}`,
          category,
          declaredMimeType: mime,
          detectedMimeType: mime,
          extension,
          sizeBytes: source.length,
          fileHash,
          quarantineBucket,
          quarantinePath: targetPath,
          status: "QUARANTINED",
        },
        update: {},
      });
      await restrictReference(item, assetId);
      await removeObject(item.sourceBucket, item.sourcePath);
      await prisma.legacyMediaMigrationItem.update({
        where: { id: item.id },
        data: {
          status: "STAGED",
          targetAssetId: assetId,
          fileHash,
          snapshot,
          stagedAt: new Date(),
          error: null,
        },
      });
    } catch (cause) {
      await prisma.legacyMediaMigrationItem.update({
        where: { id: item.id },
        data: { status: "FAILED", error: cause instanceof Error ? cause.message : String(cause) },
      });
    }
  }
  const [processedItems, failedItems] = await Promise.all([
    prisma.legacyMediaMigrationItem.count({ where: { jobId: job.id, status: "STAGED" } }),
    prisma.legacyMediaMigrationItem.count({ where: { jobId: job.id, status: "FAILED" } }),
  ]);
  await prisma.legacyMediaMigrationJob.update({
    where: { id: job.id },
    data: {
      status: failedItems ? "STAGED_WITH_FAILURES" : "STAGED",
      processedItems,
      failedItems,
      completedAt: new Date(),
      rollbackManifest: { manifestFile, quarantineBucket },
    },
  });
  console.log(JSON.stringify({ jobId: job.id, manifestHash, processedItems, failedItems }, null, 2));
}

async function finalize() {
  const jobId = String(args.get("--job") || "");
  if (!jobId) throw new Error("Informe --job <id>.");
  const items = await prisma.legacyMediaMigrationItem.findMany({
    where: { jobId, status: "STAGED", targetAssetId: { not: null } },
  });
  for (const item of items) {
    const asset = await prisma.uploadAsset.findUnique({ where: { id: item.targetAssetId } });
    if (!asset || asset.status !== "APPROVED" || !asset.controlledUrl) continue;
    await restoreReference(item, asset.controlledUrl);
    await prisma.legacyMediaMigrationItem.update({
      where: { id: item.id },
      data: { status: "FINALIZED", finalizedAt: new Date(), error: null },
    });
  }
  const remaining = await prisma.legacyMediaMigrationItem.count({ where: { jobId, status: "STAGED" } });
  await prisma.legacyMediaMigrationJob.update({
    where: { id: jobId },
    data: { status: remaining ? "AWAITING_REVIEW" : "COMPLETED", mode: "FINALIZE", completedAt: remaining ? null : new Date() },
  });
  console.log(JSON.stringify({ jobId, remaining }, null, 2));
}

async function rollback() {
  const jobId = String(args.get("--job") || "");
  if (!jobId) throw new Error("Informe --job <id>.");
  const job = await prisma.legacyMediaMigrationJob.findUniqueOrThrow({ where: { id: jobId } });
  requireApproval(job.manifestHash);
  const items = await prisma.legacyMediaMigrationItem.findMany({
    where: { jobId, status: { in: ["STAGED", "FINALIZED", "FAILED"] }, targetAssetId: { not: null } },
  });
  for (const item of items) {
    try {
      const asset = await prisma.uploadAsset.findUniqueOrThrow({ where: { id: item.targetAssetId } });
      const bucket = asset.approvedBucket || asset.quarantineBucket;
      const path = asset.approvedPath || asset.quarantinePath;
      const contents = await downloadObject(bucket, path);
      const { mime } = mimeFromPath(item.sourcePath);
      await uploadObject(item.sourceBucket, item.sourcePath, contents, mime, true);
      await restoreReference(item, item.sourceUrl);
      await prisma.legacyMediaMigrationItem.update({
        where: { id: item.id },
        data: { status: "ROLLED_BACK", rolledBackAt: new Date(), error: null },
      });
    } catch (cause) {
      await prisma.legacyMediaMigrationItem.update({
        where: { id: item.id },
        data: { status: "ROLLBACK_FAILED", error: cause instanceof Error ? cause.message : String(cause) },
      });
    }
  }
  await prisma.legacyMediaMigrationJob.update({
    where: { id: jobId },
    data: { status: "ROLLED_BACK", mode: "ROLLBACK", completedAt: new Date() },
  });
  console.log(JSON.stringify({ jobId, status: "ROLLED_BACK" }, null, 2));
}

const handlers = { PLAN: plan, STAGE: stage, FINALIZE: finalize, ROLLBACK: rollback };
handlers[mode]()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
