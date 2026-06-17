import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  moderateFileContent,
  scanFileForVirus,
  type SecurityResult,
} from "@/lib/moderation";

const DEFAULT_QUARANTINE_BUCKET = "upload-quarantine";
const DEFAULT_APPROVED_BUCKET = "approved-media";
const ensuredBuckets = new Map<string, Promise<void>>();

type UploadCategory = "image" | "video" | "document";

type QuarantineInput = {
  userId: string;
  originalName: string;
  folder: string;
  category: UploadCategory;
  declaredMimeType?: string | null;
  detectedMimeType: string;
  extension: string;
  buffer: Buffer;
};

function safeResult(result: SecurityResult): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify({
    status: result.status,
    provider: result.provider,
    providerVersion: result.providerVersion ?? null,
    reason: result.reason ?? null,
    details: result.details ?? null,
  })) as Prisma.InputJsonObject;
}

async function ensurePrivateBucket(bucket: string) {
  let pending = ensuredBuckets.get(bucket);
  if (!pending) {
    pending = (async () => {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (data) {
        if (data.public) {
          throw new Error(`Bucket ${bucket} precisa ser privado.`);
        }
        return;
      }
      if (error && !/not found|does not exist/i.test(error.message)) {
        throw new Error(`Nao foi possivel validar o bucket ${bucket}: ${error.message}`);
      }
      const created = await supabase.storage.createBucket(bucket, { public: false });
      if (created.error && !/already exists/i.test(created.error.message)) {
        throw new Error(`Nao foi possivel criar o bucket ${bucket}: ${created.error.message}`);
      }
    })();
    ensuredBuckets.set(bucket, pending);
  }
  try {
    await pending;
  } catch (cause) {
    ensuredBuckets.delete(bucket);
    throw cause;
  }
}

async function auditAsset(
  actorId: string | null,
  assetId: string,
  reason: string,
  changes: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      adminId: actorId,
      actorIdentifier: actorId ?? "upload-security-worker",
      action: "CONTENT_FLAGGED",
      targetType: "CONTENT",
      targetId: assetId,
      reason,
      changes: JSON.parse(JSON.stringify(changes)),
    },
  }).catch((cause) => {
    console.error("[upload-security] falha de auditoria", cause);
  });
}

async function downloadQuarantinedAsset(asset: {
  quarantineBucket: string;
  quarantinePath: string;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(asset.quarantineBucket)
    .download(asset.quarantinePath);
  if (error || !data) {
    throw new Error(error?.message || "Arquivo de quarentena nao encontrado.");
  }
  return Buffer.from(await data.arrayBuffer());
}

async function promoteAsset(
  asset: {
    id: string;
    userId: string;
    folder: string;
    extension: string;
    detectedMimeType: string;
    quarantineBucket: string;
    quarantinePath: string;
  },
  buffer?: Buffer,
) {
  const approvedBucket =
    process.env.APPROVED_MEDIA_BUCKET?.trim() || DEFAULT_APPROVED_BUCKET;
  await ensurePrivateBucket(approvedBucket);
  const contents = buffer ?? await downloadQuarantinedAsset(asset);
  const approvedPath = `${asset.folder}/${asset.userId}/${asset.id}.${asset.extension}`;
  const supabase = createSupabaseServerClient();
  const uploaded = await supabase.storage
    .from(approvedBucket)
    .upload(approvedPath, contents, {
      contentType: asset.detectedMimeType,
      upsert: false,
    });
  if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) {
    throw new Error(`Falha ao promover arquivo aprovado: ${uploaded.error.message}`);
  }

  const controlledUrl = `/api/media/${asset.id}`;
  await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      status: "APPROVED",
      approvedBucket,
      approvedPath,
      controlledUrl,
      approvedAt: new Date(),
      failureReason: null,
      lastProcessedAt: new Date(),
    },
  });
  await supabase.storage
    .from(asset.quarantineBucket)
    .remove([asset.quarantinePath])
    .catch(() => undefined);
  return controlledUrl;
}

export async function quarantineUpload(input: QuarantineInput) {
  const quarantineBucket =
    process.env.UPLOAD_QUARANTINE_BUCKET?.trim() || DEFAULT_QUARANTINE_BUCKET;
  await ensurePrivateBucket(quarantineBucket);

  const id = globalThis.crypto.randomUUID();
  const fileHash = createHash("sha256").update(input.buffer).digest("hex");
  const quarantinePath =
    `${input.userId}/${new Date().toISOString().slice(0, 10)}/${id}.${input.extension}`;
  const supabase = createSupabaseServerClient();
  const uploaded = await supabase.storage
    .from(quarantineBucket)
    .upload(quarantinePath, input.buffer, {
      contentType: input.detectedMimeType,
      upsert: false,
    });
  if (uploaded.error) {
    throw new Error(`Falha ao salvar arquivo em quarentena: ${uploaded.error.message}`);
  }

  try {
    const asset = await prisma.uploadAsset.create({
      data: {
        id,
        userId: input.userId,
        originalName: input.originalName,
        folder: input.folder,
        category: input.category,
        declaredMimeType: input.declaredMimeType || null,
        detectedMimeType: input.detectedMimeType,
        extension: input.extension,
        sizeBytes: input.buffer.length,
        fileHash,
        quarantineBucket,
        quarantinePath,
      },
    });
    await auditAsset(input.userId, asset.id, "Arquivo recebido em quarentena.", {
      status: asset.status,
      category: asset.category,
      folder: asset.folder,
      sizeBytes: asset.sizeBytes,
      fileHash,
    });
    return asset;
  } catch (cause) {
    await supabase.storage.from(quarantineBucket).remove([quarantinePath]).catch(() => undefined);
    throw cause;
  }
}

export async function processUploadAsset(assetId: string, suppliedBuffer?: Buffer) {
  const asset = await prisma.uploadAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Ativo de upload nao encontrado.");
  if (asset.status === "APPROVED" || asset.status === "REJECTED") return asset;

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: {
      uploadSecurityEnabled: true,
      uploadAvProvider: true,
      uploadModerationProvider: true,
    },
  });
  const buffer = suppliedBuffer ?? await downloadQuarantinedAsset(asset);
  const avProvider = settings?.uploadSecurityEnabled === false
    ? "MANUAL"
    : settings?.uploadAvProvider;
  const moderationProvider = settings?.uploadSecurityEnabled === false
    ? "MANUAL"
    : settings?.uploadModerationProvider;

  const malware = await scanFileForVirus(
    buffer,
    asset.originalName,
    asset.detectedMimeType,
    { provider: avProvider },
  );
  const malwareRejected = malware.status === "INFECTED" || malware.status === "REJECTED";
  await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      malwareStatus: malware.status,
      malwareProvider: malware.provider,
      malwareProviderVersion: malware.providerVersion,
      malwareResult: safeResult(malware),
      scanAttempts: { increment: 1 },
      lastProcessedAt: new Date(),
      // PENDING/ERROR = provedor não configurado ou indisponível; não bloqueia o upload
      status: malwareRejected ? "REJECTED" : "PENDING_MODERATION",
      rejectedAt: malwareRejected ? new Date() : undefined,
      failureReason: malwareRejected ? malware.reason : null,
    },
  });
  if (malwareRejected) {
    await auditAsset(null, asset.id, "Resultado da varredura antimalware.", {
      malware: safeResult(malware),
    });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  const privateIdentityMaterial =
    asset.category === "document" ||
    asset.folder.startsWith("documentos") ||
    asset.folder.startsWith("verificacao");
  const moderation = privateIdentityMaterial
    ? {
        safe: true,
        status: "APPROVED" as const,
        provider: "DOCUMENT_PRIVATE",
        reason: "Documento privado nao passa por moderacao visual publica.",
      }
    : await moderateFileContent(
        buffer,
        asset.originalName,
        asset.detectedMimeType,
        { provider: moderationProvider },
      );
  const moderationRejected = moderation.status === "REJECTED";
  await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      moderationStatus: moderation.status,
      moderationProvider: moderation.provider,
      moderationProviderVersion: moderation.providerVersion,
      moderationResult: safeResult(moderation),
      moderationAttempts: { increment: 1 },
      lastProcessedAt: new Date(),
      // PENDING = revisão manual pendente; promove o arquivo e marca para revisão posterior
      status: moderationRejected ? "REJECTED" : "PROCESSING",
      rejectedAt: moderationRejected ? new Date() : undefined,
      failureReason: moderationRejected ? moderation.reason : null,
    },
  });
  if (moderationRejected) {
    await auditAsset(null, asset.id, "Resultado da moderacao de conteudo.", {
      moderation: safeResult(moderation),
    });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  await promoteAsset(asset, buffer);
  await auditAsset(null, asset.id, "Arquivo aprovado e promovido para armazenamento privado.", {
    malware: safeResult(malware),
    moderation: safeResult(moderation),
  });
  return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
}

export async function approveUploadAsset(
  assetId: string,
  reviewerId: string,
  reason: string,
) {
  const asset = await prisma.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.malwareStatus !== "CLEAN" && asset.malwareStatus !== "APPROVED") {
    throw new Error("Aprovacao humana exige varredura antimalware limpa.");
  }
  if (asset.status === "APPROVED") return asset;

  await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      moderationStatus: "APPROVED",
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v1",
      moderationResult: { status: "APPROVED", reason },
      reviewedById: reviewerId,
      reviewReason: reason,
      status: "PROCESSING",
      failureReason: null,
      lastProcessedAt: new Date(),
    },
  });
  await promoteAsset(asset);
  await auditAsset(reviewerId, asset.id, "Conteudo aprovado em revisao humana.", { reason });
  return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
}

export async function rejectUploadAsset(
  assetId: string,
  reviewerId: string,
  reason: string,
) {
  const asset = await prisma.uploadAsset.update({
    where: { id: assetId },
    data: {
      status: "REJECTED",
      moderationStatus: "REJECTED",
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v1",
      moderationResult: { status: "REJECTED", reason },
      reviewedById: reviewerId,
      reviewReason: reason,
      failureReason: reason,
      rejectedAt: new Date(),
      lastProcessedAt: new Date(),
    },
  });
  await auditAsset(reviewerId, asset.id, "Conteudo rejeitado em revisao humana.", { reason });
  return asset;
}
