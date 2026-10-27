import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { manualMediaReviewBlockers } from "@/lib/manual-media-review";
import { evaluateMediaPublicationGates } from "@/lib/media-security";
import { getMediaStorageProvider, type MediaStorageName } from "@/lib/media-storage";
import { moderateFileContent, scanFileForVirus, type SecurityResult } from "@/lib/moderation";
import { enqueueMalwareScan } from "@/lib/clamav-scan-queue";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  contentRating: "STANDARD" | "ADULT_SUGGESTIVE" | "ADULT_EXPLICIT";
  visibility: "PUBLIC" | "PRIVATE" | "SUBSCRIBERS";
  ageIdentityStatus: "PASS" | "PENDING";
  consentStatus: "PASS" | "PENDING";
  adminReviewRequired: boolean;
  depictedPeople: Array<{
    personReference: string;
    relationship?: string;
    isUploader: boolean;
    isContentOwner: boolean;
    ageStatus: "PASS" | "PENDING";
    consentStatus: "PASS" | "PENDING";
    ageVerificationReference?: string | null;
    consentReference?: string | null;
  }>;
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
        if (data.public) throw new Error(`Bucket ${bucket} precisa ser privado.`);
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

async function auditAsset(actorId: string | null, assetId: string, reason: string, changes: Record<string, unknown>) {
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
  }).catch((cause) => console.error("[upload-security] falha de auditoria", cause));
}

type StoredAsset = {
  storageProvider?: string | null;
  quarantineBucket: string;
  quarantinePath: string;
  approvedBucket?: string | null;
  approvedPath?: string | null;
};

async function downloadAssetForProcessing(asset: StoredAsset) {
  const provider = getMediaStorageProvider((asset.storageProvider || "SUPABASE") as MediaStorageName);
  try {
    return await provider.download(asset.quarantineBucket, asset.quarantinePath);
  } catch (quarantineError) {
    if (asset.approvedBucket && asset.approvedPath) {
      return provider.download(asset.approvedBucket, asset.approvedPath);
    }
    throw quarantineError;
  }
}

function publicationGate(asset: {
  userId: string;
  uploadCompletedAt: Date | null;
  malwareStatus: string;
  moderationStatus: string;
  ageIdentityStatus: string;
  consentStatus: string;
  adminReviewRequired: boolean;
  adminReviewStatus: string;
  takedownStatus: string;
}) {
  return evaluateMediaPublicationGates({
    uploadComplete: Boolean(asset.uploadCompletedAt),
    malwareStatus: asset.malwareStatus,
    moderationStatus: asset.moderationStatus,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    adminReviewRequired: asset.adminReviewRequired,
    adminReviewStatus: asset.adminReviewStatus,
    takedownStatus: asset.takedownStatus,
    ownerId: asset.userId,
  });
}

async function ensureProfessionalPhotoReference(asset: { userId: string; folder: string; category: string }, controlledUrl: string) {
  if (asset.category !== "image" || !asset.folder.startsWith("profiles")) return;
  const professional = await prisma.professional.findUnique({
    where: { userId: asset.userId },
    select: { id: true },
  });
  if (!professional) return;
  const existing = await prisma.professionalPhoto.findFirst({
    where: { professionalId: professional.id, url: controlledUrl },
    select: { id: true },
  });
  if (existing) return;
  const [visibleCount, lastPhoto] = await Promise.all([
    prisma.professionalPhoto.count({ where: { professionalId: professional.id, hiddenAt: null } }),
    prisma.professionalPhoto.findFirst({
      where: { professionalId: professional.id },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ]);
  await prisma.professionalPhoto.create({
    data: {
      professionalId: professional.id,
      url: controlledUrl,
      cover: visibleCount === 0,
      order: (lastPhoto?.order ?? -1) + 1,
    },
  });
}

async function promoteAsset(
  asset: {
    id: string;
    userId: string;
    folder: string;
    category: string;
    extension: string;
    detectedMimeType: string;
    storageProvider?: string | null;
    quarantineBucket: string;
    quarantinePath: string;
    approvedBucket?: string | null;
    approvedPath?: string | null;
  },
  buffer?: Buffer,
) {
  const current = await prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  const gates = publicationGate(current);
  if (!gates.publishable) throw new Error(`Publicacao bloqueada pelos gates: ${gates.blockers.join(", ")}.`);

  const approvedBucket = process.env.APPROVED_MEDIA_BUCKET?.trim() || DEFAULT_APPROVED_BUCKET;
  await ensurePrivateBucket(approvedBucket);
  const contents = buffer ?? await downloadAssetForProcessing(asset);
  const approvedPath = `${asset.folder}/${asset.userId}/${asset.id}.${asset.extension}`;
  const provider = getMediaStorageProvider((asset.storageProvider || "SUPABASE") as MediaStorageName);
  await provider.upload({ bucket: approvedBucket, path: approvedPath, contents, contentType: asset.detectedMimeType, overwrite: false });

  const controlledUrl = `/api/media/${asset.id}`;
  await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      status: "APPROVED",
      approvedBucket,
      approvedPath,
      controlledUrl,
      storageProvider: provider.name,
      approvedAt: new Date(),
      failureReason: null,
      lastProcessedAt: new Date(),
    },
  });
  await ensureProfessionalPhotoReference(asset, controlledUrl);
  if (asset.category === "image" && asset.folder.startsWith("profiles")) {
    const professional = await prisma.professional.findUnique({
      where: { userId: asset.userId },
      select: { id: true },
    });
    if (professional) {
      const { attemptAutomaticProfessionalPublication } = await import("@/lib/professional-auto-publication");
      await attemptAutomaticProfessionalPublication(professional.id, "profile-media-approved").catch((cause) => {
        console.error("[upload-security] publicação automática adiada", {
          professionalId: professional.id,
          assetId: asset.id,
          reason: cause instanceof Error ? cause.name : "unknown",
        });
      });
    }
  }
  await provider.delete(asset.quarantineBucket, asset.quarantinePath).catch(() => undefined);
  return controlledUrl;
}

export async function quarantineUpload(input: QuarantineInput) {
  const quarantineBucket = process.env.UPLOAD_QUARANTINE_BUCKET?.trim() || DEFAULT_QUARANTINE_BUCKET;
  await ensurePrivateBucket(quarantineBucket);
  const id = globalThis.crypto.randomUUID();
  const fileHash = createHash("sha256").update(input.buffer).digest("hex");
  const quarantinePath = `${input.userId}/${new Date().toISOString().slice(0, 10)}/${id}.${input.extension}`;
  const provider = getMediaStorageProvider("SUPABASE");
  await provider.upload({ bucket: quarantineBucket, path: quarantinePath, contents: input.buffer, contentType: input.detectedMimeType, overwrite: false });

  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: { uploadSecurityEnabled: true },
    });
    const createAsyncMalwareJob = process.env.UPLOAD_AV_ASYNC_ENABLED === "true"
      && settings?.uploadSecurityEnabled !== false;
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
        storageProvider: provider.name,
        uploadCompletedAt: new Date(),
        contentRating: input.contentRating,
        visibility: input.visibility,
        ageIdentityStatus: input.ageIdentityStatus,
        consentStatus: input.consentStatus,
        adminReviewRequired: input.adminReviewRequired,
        adminReviewStatus: input.adminReviewRequired ? "PENDING" : "NOT_REQUIRED",
        depictedPeople: {
          create: input.depictedPeople.map((person) => ({
            ...person,
            verificationDate: person.ageStatus === "PASS" && person.consentStatus === "PASS" ? new Date() : null,
          })),
        },
        // The asset and its first AV job must commit together. Otherwise a
        // process restart between this insert and processUploadAsset leaves a
        // permanently quarantined asset with no durable work item.
        malwareScanJob: createAsyncMalwareJob ? { create: { status: "QUEUED" } } : undefined,
      },
    });
    await auditAsset(input.userId, asset.id, "Arquivo recebido em quarentena.", {
      status: asset.status,
      category: asset.category,
      folder: asset.folder,
      sizeBytes: asset.sizeBytes,
      fileHash,
      contentRating: input.contentRating,
      visibility: input.visibility,
    });
    return asset;
  } catch (cause) {
    await provider.delete(quarantineBucket, quarantinePath).catch(() => undefined);
    throw cause;
  }
}

export async function processUploadAsset(
  assetId: string,
  suppliedBuffer?: Buffer,
  options: { enqueueRetry?: boolean } = {},
) {
  let asset = await prisma.uploadAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Ativo de upload nao encontrado.");
  if (asset.status === "REJECTED") return asset;
  if (asset.status === "APPROVED" && publicationGate(asset).publishable) {
    if (asset.controlledUrl) await ensureProfessionalPhotoReference(asset, asset.controlledUrl);
    return asset;
  }
  if (asset.status === "APPROVED") {
    asset = await prisma.uploadAsset.update({
      where: { id: asset.id },
      data: { status: "QUARANTINED", approvedAt: null, failureReason: "Fail-closed: gates obrigatorios incompletos." },
    });
  }

  const existingGates = publicationGate(asset);
  if (existingGates.publishable) {
    await promoteAsset(asset, suppliedBuffer);
    await auditAsset(null, asset.id, "Processamento retomado com controles obrigatorios ja aprovados.", {
      preservedMalwareStatus: asset.malwareStatus,
      preservedModerationStatus: asset.moderationStatus,
      preservedAdminReviewStatus: asset.adminReviewStatus,
    });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: { uploadSecurityEnabled: true, uploadAvProvider: true, uploadModerationProvider: true },
  });
  const existingMalwarePassed = asset.malwareStatus === "CLEAN" || asset.malwareStatus === "APPROVED";
  if (!existingMalwarePassed && process.env.UPLOAD_AV_ASYNC_ENABLED === "true" && settings?.uploadSecurityEnabled !== false) {
    await enqueueMalwareScan(asset.id);
    return prisma.uploadAsset.update({
      where: { id: asset.id },
      data: {
        status: "QUARANTINED",
        malwareStatus: "PENDING",
        malwareProvider: "CLAMAV_CLOUD_RUN",
        failureReason: null,
      },
    });
  }
  const buffer = suppliedBuffer ?? await downloadAssetForProcessing(asset);
  const avProvider = settings?.uploadSecurityEnabled === false ? "MANUAL" : settings?.uploadAvProvider;
  const moderationProvider = settings?.uploadSecurityEnabled === false ? "MANUAL" : settings?.uploadModerationProvider;

  const malware: SecurityResult = existingMalwarePassed
    ? {
        safe: true,
        status: asset.malwareStatus as "CLEAN" | "APPROVED",
        provider: asset.malwareProvider || "PRESERVED_VALID_RESULT",
        providerVersion: asset.malwareProviderVersion || undefined,
        reason: "Resultado valido preservado durante a retomada.",
      }
    : await scanFileForVirus(buffer, asset.originalName, asset.detectedMimeType, { provider: avProvider });
  const malwarePassed = malware.status === "CLEAN" || malware.status === "APPROVED";
  const malwareRejected = malware.status === "INFECTED" || malware.status === "REJECTED";
  if (!existingMalwarePassed) {
    await prisma.uploadAsset.update({
      where: { id: asset.id },
      data: {
        malwareStatus: malware.status,
        malwareProvider: malware.provider,
        malwareProviderVersion: malware.providerVersion,
        malwareResult: safeResult(malware),
        scanAttempts: { increment: 1 },
        lastProcessedAt: new Date(),
        status: malwareRejected ? "REJECTED" : malwarePassed ? "PENDING_MODERATION" : "QUARANTINED",
        rejectedAt: malwareRejected ? new Date() : undefined,
        failureReason: malwarePassed ? null : malware.reason || "Varredura antimalware nao concluiu com PASS.",
      },
    });
  }
  if (!malwarePassed) {
    if (!malwareRejected && options.enqueueRetry !== false) {
      await enqueueMalwareScan(asset.id).catch((cause) => {
        console.error("[upload-quarantine] nao foi possivel enfileirar retry", {
          assetId: asset.id,
          reason: cause instanceof Error ? cause.message : "unknown",
        });
      });
    }
    await auditAsset(null, asset.id, "Resultado da varredura antimalware.", { malware: safeResult(malware), failClosed: !malwareRejected });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  const privateIdentityMaterial = asset.category === "document" || asset.folder.startsWith("documentos") || asset.folder.startsWith("verificacao");
  const existingModerationPassed = asset.moderationStatus === "APPROVED";
  const moderation: SecurityResult = existingModerationPassed
    ? {
        safe: true,
        status: "APPROVED",
        provider: asset.moderationProvider || "PRESERVED_VALID_RESULT",
        providerVersion: asset.moderationProviderVersion || undefined,
        reason: "Decisao de conteudo valida preservada durante a retomada.",
      }
    : privateIdentityMaterial
      ? { safe: true, status: "APPROVED", provider: "DOCUMENT_PRIVATE", reason: "Documento privado fora de publicacao visual." }
      : await moderateFileContent(buffer, asset.originalName, asset.detectedMimeType, { provider: moderationProvider });
  const moderationPassed = moderation.status === "APPROVED";
  const moderationRejected = moderation.status === "REJECTED";
  if (!existingModerationPassed) {
    const automatedApproval = moderationPassed && moderation.autoPublishEligible === true;
    await prisma.uploadAsset.update({
      where: { id: asset.id },
      data: {
        moderationStatus: moderation.status,
        moderationProvider: moderation.provider,
        moderationProviderVersion: moderation.providerVersion,
        moderationResult: safeResult(moderation),
        moderationAttempts: { increment: 1 },
        contentRating: moderation.contentRating ?? asset.contentRating,
        adminReviewRequired: privateIdentityMaterial ? false : !automatedApproval,
        adminReviewStatus: privateIdentityMaterial || automatedApproval ? "NOT_REQUIRED" : "PENDING",
        lastProcessedAt: new Date(),
        status: moderationRejected ? "REJECTED" : moderationPassed ? "PROCESSING" : "QUARANTINED",
        rejectedAt: moderationRejected ? new Date() : undefined,
        failureReason: moderationPassed ? null : moderation.reason || "Moderacao nao concluiu com PASS.",
      },
    });
  }
  if (!moderationPassed) {
    await auditAsset(null, asset.id, "Resultado da moderacao de conteudo.", { moderation: safeResult(moderation), failClosed: !moderationRejected });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  const ready = await prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  const gates = publicationGate(ready);
  if (!gates.publishable) {
    const onlyAdminReview = gates.blockers.length === 1 && gates.blockers[0] === "ADMIN_REVIEW";
    await prisma.uploadAsset.update({
      where: { id: asset.id },
      data: {
        status: ready.adminReviewRequired && onlyAdminReview ? "PENDING_REVIEW" : "QUARANTINED",
        failureReason: `Gates pendentes: ${gates.blockers.join(", ")}.`,
      },
    });
    await auditAsset(null, asset.id, "Arquivo mantido em quarentena por gates obrigatorios.", { blockers: gates.blockers });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  await promoteAsset(ready, buffer);
  await auditAsset(null, asset.id, "Arquivo aprovado e promovido para armazenamento privado.", {
    malware: safeResult(malware),
    moderation: safeResult(moderation),
    automaticPublication: moderation.autoPublishEligible === true,
  });
  return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
}

export async function resumeProfessionalProfileAssetsAfterApproval(input: {
  professionalId: string;
  userId: string;
  actorId: string;
}) {
  const professional = await prisma.professional.findFirst({
    where: {
      id: input.professionalId,
      userId: input.userId,
      status: "ACTIVE",
      verified: true,
      kycStatus: "APPROVED",
      user: { blocked: false },
    },
    select: { id: true },
  });
  if (!professional) throw new Error("Cadastro profissional ainda nao esta elegivel para retomar as midias.");

  const assets = await prisma.uploadAsset.findMany({
    where: {
      userId: input.userId,
      category: { in: ["image", "video"] },
      OR: [
        { folder: { startsWith: "profiles" } },
        { folder: { startsWith: "profile-videos" } },
      ],
      status: { notIn: ["APPROVED", "REJECTED"] },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true },
  });

  const results = [] as Array<{ assetId: string; status: "fulfilled" | "rejected"; reason?: string }>;
  for (const asset of assets) {
    try {
      await processUploadAsset(asset.id);
      results.push({ assetId: asset.id, status: "fulfilled" });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "Falha desconhecida";
      results.push({ assetId: asset.id, status: "rejected", reason });
      await auditAsset(input.actorId, asset.id, "Falha ao retomar midia depois da aprovacao profissional.", { reason });
    }
  }
  return results;
}

export async function approveUploadAsset(assetId: string, reviewerId: string, reason: string) {
  const asset = await prisma.uploadAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: {
      owner: { select: { blocked: true, professional: { select: { id: true, status: true, verified: true, kycStatus: true, registrationSubmittedAt: true } } } },
      depictedPeople: { select: { ageStatus: true, consentStatus: true, revokedAt: true } },
    },
  });
  const professional = asset.owner.professional;
  const openReport = await prisma.report.findFirst({
    where: {
      status: { in: ["PENDING", "REVIEWING"] },
      OR: [
        { targetType: { in: ["CONTENT", "PHOTO"] }, targetId: { in: [asset.id, asset.controlledUrl ?? ""] } },
        ...(professional ? [{ targetType: "PROFESSIONAL", targetId: professional.id }] : []),
        { targetType: "USER", targetId: asset.userId },
      ],
    },
    select: { id: true },
  });
  const blockers = manualMediaReviewBlockers({
    category: asset.category,
    folder: asset.folder,
    uploadCompletedAt: asset.uploadCompletedAt,
    malwareStatus: asset.malwareStatus,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    takedownStatus: asset.takedownStatus,
    ownerBlocked: asset.owner.blocked,
    professionalStatus: professional?.status,
    professionalVerified: professional?.verified,
    professionalKycStatus: professional?.kycStatus,
    professionalRegistrationSubmittedAt: professional?.registrationSubmittedAt,
    depictedPeople: asset.depictedPeople,
    hasOpenReport: Boolean(openReport),
  });
  if (blockers.length) throw new Error(`Aprovacao humana bloqueada: ${blockers.join(", ")}.`);
  if (asset.status === "APPROVED" && publicationGate(asset).publishable) return asset;

  const reviewed = await prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      moderationStatus: "APPROVED",
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v2",
      moderationResult: { status: "APPROVED", reason },
      adminReviewStatus: "PASS",
      reviewedById: reviewerId,
      reviewReason: reason,
      status: "PROCESSING",
      failureReason: null,
      lastProcessedAt: new Date(),
    },
  });
  await promoteAsset(reviewed);
  await auditAsset(reviewerId, asset.id, "Conteudo aprovado em revisao humana.", { reason });
  return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
}

export async function rejectUploadAsset(assetId: string, reviewerId: string, reason: string) {
  const asset = await prisma.uploadAsset.update({
    where: { id: assetId },
    data: {
      status: "REJECTED",
      moderationStatus: "REJECTED",
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v2",
      moderationResult: { status: "REJECTED", reason },
      adminReviewStatus: "REJECTED",
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

export async function escalateUploadAsset(assetId: string, reviewerId: string, reason: string) {
  const asset = await prisma.uploadAsset.update({
    where: { id: assetId },
    data: {
      status: "QUARANTINED",
      moderationStatus: "ESCALATED",
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v2",
      moderationResult: { status: "ESCALATED", reason },
      adminReviewStatus: "ESCALATED",
      reviewedById: reviewerId,
      reviewReason: reason,
      failureReason: reason,
      approvedAt: null,
      lastProcessedAt: new Date(),
    },
  });
  await auditAsset(reviewerId, asset.id, "Conteudo escalado em revisao humana.", { reason });
  return asset;
}
