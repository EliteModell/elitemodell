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

const args = new Set(process.argv.slice(2));
const outputArg = [...args].find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
if (!outputArg) throw new Error("Informe --output fora do repositorio e com extensao .embk.");
const output = assertExternalEncryptedOutput(outputArg);
const resume = args.has("--resume");
const verifySource = args.has("--verify-source");
const prisma = new PrismaClient();

function destinationFor(asset) {
  const digest = asset.fileHash || createHash("sha256").update(asset.id).digest("hex");
  return {
    product: asset.category === "video" ? "BUNNY_STREAM_CANDIDATE" : "BUNNY_STORAGE_CDN_CANDIDATE",
    bucket: asset.category === "video" ? "video-library" : "media-zone",
    path: `${asset.contentRating.toLowerCase()}/${asset.category}/${digest.slice(0, 2)}/${asset.id}.${asset.extension}`,
  };
}

async function downloadSupabase(bucket, storagePath) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Credenciais Supabase ausentes para --verify-source.");
  const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha ao ler origem ${bucket}: HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function previousItems(key) {
  if (!resume) return new Map();
  const payload = decryptBackupPayload(await readFile(output), key);
  const previous = JSON.parse(payload.toString("utf8"));
  payload.fill(0);
  return new Map((previous.items ?? []).map((item) => [item.assetId, item]));
}

async function main() {
  const key = recoveryKeyFromEnvironment();
  const previous = await previousItems(key);
  const assets = await prisma.uploadAsset.findMany({
    where: { status: { not: "REJECTED" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      contentRating: true,
      extension: true,
      sizeBytes: true,
      fileHash: true,
      storageProvider: true,
      quarantineBucket: true,
      quarantinePath: true,
      approvedBucket: true,
      approvedPath: true,
      status: true,
    },
  });
  const items = [];
  for (const asset of assets) {
    const source = {
      provider: asset.storageProvider,
      bucket: asset.approvedBucket ?? asset.quarantineBucket,
      path: asset.approvedPath ?? asset.quarantinePath,
    };
    let verification = previous.get(asset.id)?.verification ?? { status: "NOT_RUN", calculatedHash: null };
    if (verifySource && source.provider === "SUPABASE" && verification.status !== "HASH_MATCH") {
      try {
        const contents = await downloadSupabase(source.bucket, source.path);
        const calculatedHash = createHash("sha256").update(contents).digest("hex");
        verification = { status: calculatedHash === asset.fileHash ? "HASH_MATCH" : "HASH_MISMATCH", calculatedHash };
        contents.fill(0);
      } catch (cause) {
        verification = {
          status: "SOURCE_ERROR",
          calculatedHash: null,
          error: cause instanceof Error ? cause.message : "Falha desconhecida.",
        };
      }
    }
    items.push({
      assetId: asset.id,
      status: "PLANNED_ONLY",
      sizeBytes: asset.sizeBytes,
      expectedHash: asset.fileHash,
      source,
      destination: destinationFor(asset),
      verification,
      rollback: { provider: source.provider, bucket: source.bucket, path: source.path, sourceDeletionPermitted: false },
    });
  }
  const duplicateGroups = [...items.reduce((groups, item) => {
    const entries = groups.get(item.expectedHash) ?? [];
    entries.push(item.assetId);
    groups.set(item.expectedHash, entries);
    return groups;
  }, new Map()).entries()]
    .filter(([, assetIds]) => assetIds.length > 1)
    .map(([hash, assetIds]) => ({ hash, assetIds }));
  const verificationCounts = items.reduce((counts, item) => {
    counts[item.verification.status] = (counts[item.verification.status] ?? 0) + 1;
    return counts;
  }, {});
  const manifest = Buffer.from(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "DRY_RUN_ONLY",
    bunnyProductionEnabled: false,
    sourceObjectsDeleted: 0,
    copyPerformed: false,
    registerDestinationPerformed: false,
    totals: {
      eligibleObjects: items.length,
      bytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
      estimatedTransferBytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
      duplicateGroups: duplicateGroups.length,
      verificationCounts,
    },
    duplicateGroups,
    resume: { supported: true, resumed: resume, priorItems: previous.size },
    rollback: { supported: true, strategy: "Keep Supabase source authoritative until verified cutover." },
    items,
  }, null, 2), "utf8");
  const encrypted = encryptBackupPayload(manifest, key);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, encrypted, { flag: resume ? "w" : "wx" });
  const verified = decryptBackupPayload(await readFile(output), key);
  if (!verified.equals(manifest)) throw new Error("Validacao do manifesto criptografado falhou.");
  manifest.fill(0);
  verified.fill(0);
  key.fill(0);
  console.log(JSON.stringify({
    output,
    encrypted: true,
    mode: "DRY_RUN_ONLY",
    objects: items.length,
    bytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
    duplicateGroups: duplicateGroups.length,
    verificationCounts,
    sourceObjectsDeleted: 0,
  }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });
