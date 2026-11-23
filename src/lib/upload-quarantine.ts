import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { manualMediaReviewBlockers } from "@/lib/manual-media-review";
import { evaluateMediaPublicationGates, PROFILE_IMAGE_REENCODED } from "@/lib/media-security";
import { getMediaStorageProvider, type MediaStorageName } from "@/lib/media-storage";
import { moderateFileContent, scanFileForVirus, type SecurityResult } from "@/lib/moderation";
import { enqueueMalwareScan } from "@/lib/clamav-scan-queue";
import { normalizeProfileImage, ProfileImageValidationError } from "@/lib/profile-image-normalization";
import { confirmedAdult, MANUAL_DOCUMENT_PROVIDER, manualAttemptAllowsPublication } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { evaluateSelfDeclarationPublication } from "@/lib/self-declaration-media-policy";

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
  category: string;
  folder: string;
  userId: string;
  uploadCompletedAt: Date | null;
  malwareStatus: string;
  moderationStatus: string;
  publicationDecisionType: string;
  ageIdentityStatus: string;
  consentStatus: string;
  adminReviewRequired: boolean;
  adminReviewStatus: string;
  takedownStatus: string;
}) {
  return evaluateMediaPublicationGates({
    category: asset.category, folder: asset.folder,
    uploadComplete: Boolean(asset.uploadCompletedAt),
    malwareStatus: asset.malwareStatus,
    moderationStatus: asset.moderationStatus,
    publicationDecisionType: asset.publicationDecisionType,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    adminReviewRequired: asset.adminReviewRequired,
    adminReviewStatus: asset.adminReviewStatus,
    takedownStatus: asset.takedownStatus,
    ownerId: asset.userId,
  });
}

function approvedEvidence(value?: string | null) {
  return Boolean(value && ["PASS", "CLEAN", "APPROVED"].includes(value.toUpperCase()));
}

// These records are declarations supplied by the uploader. They are useful for
// consent/audit matching, but are not a visual-analysis result and must never,
// by themselves, prove that no additional person appears in the media.
type DeclaredDepictedPersonRecord = {
  personReference: string;
  relationship: string | null;
  isUploader: boolean;
  isContentOwner: boolean;
  ageStatus: string;
  consentStatus: string;
  ageVerificationReference: string | null;
  consentReference: string | null;
  revokedAt: Date | null;
};

function declaredRelationship(person: DeclaredDepictedPersonRecord) {
  if (person.isUploader && person.isContentOwner
    && ["SELF", "SELF_DECLARED", "DEPICTED_PERSON"].includes(person.relationship ?? "DEPICTED_PERSON")) {
    return "SELF_DECLARED";
  }
  return person.relationship;
}

function declaredPeopleSignature(people: DeclaredDepictedPersonRecord[]) {
  return people
    .map((person) => JSON.stringify({
      personReference: person.personReference,
      relationship: declaredRelationship(person),
      isUploader: person.isUploader,
      isContentOwner: person.isContentOwner,
      ageStatus: person.ageStatus,
      consentStatus: person.consentStatus,
      ageVerificationReference: person.ageVerificationReference,
      consentReference: person.consentReference,
      revoked: Boolean(person.revokedAt),
    }))
    .sort()
    .join("|");
}

async function reusableModerationDecision(asset: {
  id: string;
  userId: string;
  fileHash: string;
  detectedMimeType: string;
  category: string;
  contentRating: string;
  ageIdentityStatus: string;
  consentStatus: string;
}) {
  if (!approvedEvidence(asset.ageIdentityStatus) || !approvedEvidence(asset.consentStatus)) return null;

  const personSelect = {
    personReference: true,
    relationship: true,
    isUploader: true,
    isContentOwner: true,
    ageStatus: true,
    consentStatus: true,
    ageVerificationReference: true,
    consentReference: true,
    revokedAt: true,
  } as const;
  const currentPeople = await prisma.mediaDepictedPerson.findMany({
    where: { assetId: asset.id },
    select: personSelect,
  });
  if (!currentPeople.length || currentPeople.some((person) => (
    !approvedEvidence(person.ageStatus)
    || !approvedEvidence(person.consentStatus)
    || Boolean(person.revokedAt)
  ))) return null;

  const candidates = await prisma.uploadAsset.findMany({
    where: {
      id: { not: asset.id },
      userId: asset.userId,
      fileHash: asset.fileHash,
      detectedMimeType: asset.detectedMimeType,
      category: asset.category,
      contentRating: asset.contentRating,
      status: "APPROVED",
      moderationStatus: "APPROVED",
      takedownStatus: "CLEAR",
      moderationProviderVersion: { not: null },
    },
    orderBy: { approvedAt: "desc" },
    take: 5,
    select: {
      id: true,
      controlledUrl: true,
      moderationProvider: true,
      moderationProviderVersion: true,
      moderationResult: true,
      depictedPeople: { select: personSelect },
      owner: { select: { professional: { select: { id: true } } } },
    },
  });
  const expectedSignature = declaredPeopleSignature(currentPeople);
  for (const candidate of candidates) {
    if (declaredPeopleSignature(candidate.depictedPeople) !== expectedSignature) continue;
    const reportTargets = [candidate.id, candidate.controlledUrl, asset.userId, candidate.owner.professional?.id]
      .filter((value): value is string => Boolean(value));
    const openReport = await prisma.report.findFirst({
      where: { status: { in: ["PENDING", "REVIEWING"] }, targetId: { in: reportTargets } },
      select: { id: true },
    });
    if (!openReport) return candidate;
  }
  return null;
}

async function clearRedundantAdminReviewForApprovedDecision(asset: {
  id: string;
  userId: string;
  controlledUrl: string | null;
  malwareStatus: string;
  moderationStatus: string;
  moderationProvider: string | null;
  moderationProviderVersion: string | null;
  moderationResult: Prisma.JsonValue | null;
  ageIdentityStatus: string;
  consentStatus: string;
  adminReviewRequired: boolean;
  adminReviewStatus: string;
  takedownStatus: string;
}) {
  if (!asset.adminReviewRequired
    || asset.adminReviewStatus !== "PENDING"
    || asset.takedownStatus !== "CLEAR"
    || !approvedEvidence(asset.malwareStatus)
    || !approvedEvidence(asset.moderationStatus)
    || !approvedEvidence(asset.ageIdentityStatus)
    || !approvedEvidence(asset.consentStatus)
    || !asset.moderationProvider
    || !asset.moderationProviderVersion
    || !asset.moderationResult) return null;

  const professional = await prisma.professional.findUnique({
    where: { userId: asset.userId },
    select: { id: true },
  });
  const targets = [asset.id, asset.controlledUrl, asset.userId, professional?.id]
    .filter((value): value is string => Boolean(value));
  const openReport = await prisma.report.findFirst({
    where: { status: { in: ["PENDING", "REVIEWING"] }, targetId: { in: targets } },
    select: { id: true },
  });
  if (openReport) return null;

  return prisma.uploadAsset.update({
    where: { id: asset.id },
    data: {
      adminReviewRequired: false,
      adminReviewStatus: "NOT_REQUIRED",
      failureReason: null,
      lastProcessedAt: new Date(),
    },
  });
}

async function ensureProfessionalPhotoReference(asset: { userId: string; folder: string; category: string }, controlledUrl: string, db: Prisma.TransactionClient = prisma) {
  if (asset.category !== "image" || !asset.folder.startsWith("profiles")) return;
  const professional = await db.professional.findUnique({
    where: { userId: asset.userId },
    select: { id: true },
  });
  if (!professional) return;
  const existing = await db.professionalPhoto.findFirst({
    where: { professionalId: professional.id, url: controlledUrl },
    select: { id: true },
  });
  if (existing) return;
  const [visibleCount, lastPhoto] = await Promise.all([
    db.professionalPhoto.count({ where: { professionalId: professional.id, hiddenAt: null } }),
    db.professionalPhoto.findFirst({
      where: { professionalId: professional.id },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ]);
  await db.professionalPhoto.create({
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
  if (current.malwareStatus !== PROFILE_IMAGE_REENCODED && asset.category === "image" && asset.folder.startsWith("profiles")) {
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
  const profileImage = input.category === "image" && input.folder.startsWith("profiles");
  if (profileImage) {
    const buffer = await normalizeProfileImage(input.buffer).catch(() => {
      throw new ProfileImageValidationError("Envie uma imagem válida que possa ser aberta e regravada.");
    });
    input = { ...input, buffer, detectedMimeType: "image/jpeg", extension: "jpg", adminReviewRequired: true };
  }
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
    const createAsyncMalwareJob = !profileImage && process.env.UPLOAD_AV_ASYNC_ENABLED === "true"
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
        ...(profileImage ? {
          status: "PENDING_REVIEW",
          malwareStatus: PROFILE_IMAGE_REENCODED,
          malwareProvider: "LOCAL_IMAGE_REENCODE",
          publicationDecisionType: "EXCEPTION_PENDING",
        } : {}),
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
  if (asset.category === "image" && asset.folder.startsWith("profiles") && asset.status !== "APPROVED") {
    if (asset.malwareStatus !== PROFILE_IMAGE_REENCODED || asset.moderationStatus !== "APPROVED" || asset.adminReviewStatus !== "PASS") {
      return reprocessProfileImage(assetId);
    }
    // Only resume promotion after a recorded human approval, using the sanitized private object.
    suppliedBuffer = undefined;
  }
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

  const normalizedApprovedDecision = await clearRedundantAdminReviewForApprovedDecision(asset);
  if (normalizedApprovedDecision) {
    asset = normalizedApprovedDecision;
    await auditAsset(null, asset.id, "Revisao administrativa redundante removida de decisao de conteudo valida.", {
      moderationProvider: asset.moderationProvider,
      moderationProviderVersion: asset.moderationProviderVersion,
      preservedModerationDecision: true,
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
          assetId,
          reason: cause instanceof Error ? cause.message : "unknown",
        });
      });
    }
    await auditAsset(null, asset.id, "Resultado da varredura antimalware.", { malware: safeResult(malware), failClosed: !malwareRejected });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
  }

  const privateIdentityMaterial = asset.category === "document" || asset.folder.startsWith("documentos") || asset.folder.startsWith("verificacao");
  if (asset.moderationStatus !== "APPROVED" && !privateIdentityMaterial) {
    const reusableDecision = await reusableModerationDecision(asset);
    if (reusableDecision) {
      asset = await prisma.uploadAsset.update({
        where: { id: asset.id },
        data: {
          moderationStatus: "APPROVED",
          moderationProvider: reusableDecision.moderationProvider || "REUSED_APPROVED_DECISION",
          moderationProviderVersion: `reused:${reusableDecision.moderationProviderVersion}`,
          moderationResult: {
            status: "APPROVED",
            reason: "Decisao anterior reutilizada para o mesmo arquivo e as mesmas evidencias.",
            sourceAssetId: reusableDecision.id,
          },
          adminReviewRequired: false,
          adminReviewStatus: "NOT_REQUIRED",
          failureReason: null,
          lastProcessedAt: new Date(),
        },
      });
      await auditAsset(null, asset.id, "Decisao de conteudo reutilizada para duplicata exata da mesma titular.", {
        sourceAssetId: reusableDecision.id,
        fileHashMatched: true,
        declaredPeopleRecordsMatched: true,
      });
    }
  }
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
    const policyDecision = await evaluateSelfDeclarationPublication(asset.id);
    if (policyDecision.allowed) {
      asset = await prisma.uploadAsset.update({
        where: { id: asset.id },
        data: {
          publicationDecisionType: "POLICY_ATTESTATION",
          publicationPolicyVersion: policyDecision.policyVersion,
          publicationDecisionAt: new Date(),
          publicationEvidence: policyDecision.evidence,
          adminReviewRequired: false,
          adminReviewStatus: "POLICY_ATTESTATION",
          status: "PROCESSING",
          failureReason: null,
          lastProcessedAt: new Date(),
        },
      });
      await auditAsset(null, asset.id, "Midia elegivel para publicacao pela politica de autodeclaracao.", {
        policyVersion: policyDecision.policyVersion,
        moderationStatusPreserved: asset.moderationStatus,
        publicationDecisionType: "POLICY_ATTESTATION",
      });
    } else {
      const requiresHumanContentReview = moderation.provider === "MANUAL"
        && moderation.status === "PENDING"
        && !moderationRejected;
      if (requiresHumanContentReview) {
        await prisma.uploadAsset.update({
          where: { id: asset.id },
          data: {
            status: "PENDING_REVIEW",
            publicationDecisionType: "EXCEPTION_PENDING",
            adminReviewRequired: true,
            adminReviewStatus: "PENDING",
            failureReason: policyDecision.reason || moderation.reason || "Aguardando revisao humana de conteudo.",
            lastProcessedAt: new Date(),
          },
        });
        await auditAsset(null, asset.id, "Midia encaminhada para revisao humana de conteudo.", {
          moderation: safeResult(moderation),
          policyBlockers: policyDecision.blockers,
          failClosed: true,
        });
        return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
      }
      await auditAsset(null, asset.id, "Resultado da moderacao de conteudo.", { moderation: safeResult(moderation), failClosed: !moderationRejected });
      return prisma.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
    }
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

async function syncReviewedProfileImageOwnerAge(assetId: string) {
  await prisma.$transaction(async (tx) => {
    const target = await tx.uploadAsset.findFirst({
      where: { id: assetId, category: "image", folder: { startsWith: "profiles" }, ageIdentityStatus: "PENDING" },
      select: { userId: true },
    });
    if (!target) return;
    const { userId } = target;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"manual-identity:" + userId}))`;
    const [profile, attempt] = await Promise.all([
      tx.professional.findUnique({
        where: { userId },
        select: { kycProvider: true, kycSessionId: true, kycStatus: true, user: { select: { blocked: true } } },
      }),
      tx.manualIdentityAttempt.findFirst({
        where: { userId, submittedAt: { not: null } }, orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      }),
    ]);
    if (profile?.kycProvider !== MANUAL_DOCUMENT_PROVIDER || profile.kycStatus !== "APPROVED" ||
        profile.user.blocked || !attempt?.birthDate || !confirmedAdult(attempt.birthDate.toISOString().slice(0, 10)) ||
        !manualAttemptAllowsPublication(profile.kycSessionId, attempt)) return;

    const verified = await tx.mediaDepictedPerson.updateMany({
      where: {
        assetId, personReference: { in: [userId, "user:" + userId] }, isUploader: true, isContentOwner: true,
        revokedAt: null, consentStatus: "PASS", ageStatus: "PENDING",
      },
      data: { ageStatus: "PASS", ageVerificationReference: attempt.id, verificationDate: attempt.reviewedAt },
    });
    if (!verified.count) return;
    const outstanding = await tx.mediaDepictedPerson.findFirst({
      where: { assetId, OR: [{ ageStatus: { not: "PASS" } }, { consentStatus: { not: "PASS" } }, { revokedAt: { not: null } }] },
      select: { id: true },
    });
    if (!outstanding) {
      await tx.uploadAsset.updateMany({ where: { id: assetId, userId, ageIdentityStatus: "PENDING" }, data: { ageIdentityStatus: "PASS" } });
    }
    await tx.auditLog.create({ data: {
      actorIdentifier: "manual-identity-media-sync", action: "SETTINGS_CHANGED", targetType: "CONTENT", targetId: assetId,
      reason: "Maioridade da titular vinculada à decisão documental já registrada.",
      changes: { verificationMethod: MANUAL_DOCUMENT_PROVIDER, ownerOnly: true, assetAgeCleared: !outstanding },
    } });
  });
}

export async function reprocessProfileImage(assetId: string) {
  const asset = await prisma.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.category !== "image" || !asset.folder.startsWith("profiles") || !asset.uploadCompletedAt ||
      ["REJECTED", "APPROVED"].includes(asset.status) ||
      ["INFECTED", "REJECTED"].includes(asset.malwareStatus) || asset.moderationStatus === "REJECTED") return asset;
  await syncReviewedProfileImageOwnerAge(assetId);
  if (asset.malwareStatus === PROFILE_IMAGE_REENCODED) return prisma.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });

  const provider = getMediaStorageProvider((asset.storageProvider || "SUPABASE") as MediaStorageName);
  const original = await provider.download(asset.quarantineBucket, asset.quarantinePath);
  if (createHash("sha256").update(original).digest("hex") !== asset.fileHash) throw new Error("A integridade da imagem original não foi confirmada.");
  let sanitized: Buffer;
  try {
    sanitized = await normalizeProfileImage(original);
  } catch {
    await prisma.uploadAsset.updateMany({
      where: { id: asset.id, fileHash: asset.fileHash, status: asset.status },
      data: { status: "REJECTED", failureReason: "A imagem falhou na decodificação ou regravação local.", rejectedAt: new Date() },
    });
    return prisma.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });
  }

  const hash = createHash("sha256").update(sanitized).digest("hex");
  const path = asset.quarantinePath + "." + hash.slice(0, 16) + ".jpg";
  await ensurePrivateBucket(asset.quarantineBucket);
  await provider.upload({ bucket: asset.quarantineBucket, path, contents: sanitized, contentType: "image/jpeg", overwrite: false });
  await prisma.$transaction(async (tx) => {
    const job = await tx.malwareScanJob.findUnique({ where: { assetId }, select: { status: true } });
    if (job && ["QUEUED", "RETRY", "FAILED"].includes(job.status)) {
      const retired = await tx.malwareScanJob.updateMany({
        where: { assetId, status: job.status, leaseToken: null },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      if (!retired.count) throw new Error("A imagem está sendo processada. Tente novamente.");
    } else if (job?.status === "PROCESSING") {
      throw new Error("A imagem está sendo processada. Tente novamente.");
    }
    const updated = await tx.uploadAsset.updateMany({
      where: { id: assetId, fileHash: asset.fileHash, quarantinePath: asset.quarantinePath, status: asset.status,
        malwareStatus: asset.malwareStatus, moderationStatus: asset.moderationStatus },
      data: {
        quarantinePath: path, fileHash: hash, sizeBytes: sanitized.length, detectedMimeType: "image/jpeg", extension: "jpg",
        malwareStatus: PROFILE_IMAGE_REENCODED, malwareProvider: "LOCAL_IMAGE_REENCODE",
        status: "PENDING_REVIEW", publicationDecisionType: "EXCEPTION_PENDING", adminReviewRequired: true, adminReviewStatus: "PENDING",
        failureReason: null, lastProcessedAt: new Date(),
      },
    });
    if (!updated.count) throw new Error("O estado da imagem mudou. Atualize a página.");
    await tx.auditLog.create({ data: {
      actorIdentifier: "profile-image-normalization", action: "SETTINGS_CHANGED", targetType: "CONTENT", targetId: assetId,
      reason: "Imagem de perfil decodificada e regravada para revisão administrativa.",
      changes: { originalHash: asset.fileHash, normalizedHash: hash, technicalValidation: PROFILE_IMAGE_REENCODED },
    } });
  });
  return prisma.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });
}

async function loadReviewableAsset(db: Prisma.TransactionClient, assetId: string, revision?: string) {
  const asset = await db.uploadAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: {
      owner: { select: { blocked: true, professional: { select: { id: true, status: true, verified: true, kycStatus: true, kycProvider: true, registrationSubmittedAt: true } } } },
      depictedPeople: { select: { ageStatus: true, consentStatus: true, revokedAt: true } },
    },
  });
  if (asset.status === "REJECTED" || asset.moderationStatus === "REJECTED") throw new Error("A mídia foi rejeitada e precisa ser substituída.");
  if (asset.status === "APPROVED") return asset;
  checkReviewRevision(asset.updatedAt, revision);
  if (asset.category === "image" && asset.folder.startsWith("profiles") && asset.malwareStatus !== PROFILE_IMAGE_REENCODED) {
    throw new Error("Valide e regrave a imagem antes de aprová-la.");
  }
  const professional = asset.owner.professional;
  const openReport = await db.report.findFirst({
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
    professionalKycProvider: professional?.kycProvider,
    professionalRegistrationSubmittedAt: professional?.registrationSubmittedAt,
    depictedPeople: asset.depictedPeople,
    hasOpenReport: Boolean(openReport),
  });
  if (blockers.length) throw new Error(`Aprovacao humana bloqueada: ${blockers.join(", ")}.`);
  return asset;
}

function checkReviewRevision(updatedAt: Date, revision?: string) {
  if (revision !== undefined && updatedAt.toISOString() !== revision) {
    throw new Error("A mídia mudou. Revise o estado atual antes de decidir.");
  }
}

async function persistReview(
  tx: Prisma.TransactionClient,
  asset: { id: string; updatedAt: Date; status: string },
  reviewerId: string,
  reason: string,
  decision: "APPROVED" | "REJECTED" | "ESCALATED",
  fields: Prisma.UploadAssetUpdateManyMutationInput,
) {
  const changed = await tx.uploadAsset.updateMany({
    where: { id: asset.id, updatedAt: asset.updatedAt, status: asset.status },
    data: {
      ...fields,
      moderationStatus: decision,
      moderationProvider: "MANUAL",
      moderationProviderVersion: "human-review-v2",
      moderationResult: { status: decision, reason },
      adminReviewStatus: decision === "APPROVED" ? "PASS" : decision,
      reviewedById: reviewerId,
      reviewReason: reason,
      lastProcessedAt: new Date(),
    },
  });
  if (!changed.count) throw new Error("Outra operação alterou a mídia. Consulte o estado atual.");
  await tx.auditLog.create({ data: {
    adminId: reviewerId, actorIdentifier: reviewerId, action: "CONTENT_FLAGGED",
    targetType: "CONTENT", targetId: asset.id, reason: "Decisão de revisão humana de mídia.",
    changes: { decision, reason },
  } });
  return tx.uploadAsset.findUniqueOrThrow({ where: { id: asset.id } });
}

export async function approveUploadAsset(assetId: string, reviewerId: string, reason: string, revision?: string) {
  const asset = await loadReviewableAsset(prisma, assetId, revision);
  if (asset.status === "APPROVED") return asset;
  if (!publicationGate({ ...asset, moderationStatus: "APPROVED", adminReviewStatus: "PASS" }).publishable) {
    throw new Error("A mídia possui controles obrigatórios pendentes.");
  }

  const approvedBucket = process.env.APPROVED_MEDIA_BUCKET?.trim() || DEFAULT_APPROVED_BUCKET;
  await ensurePrivateBucket(approvedBucket);
  const provider = getMediaStorageProvider(asset.storageProvider as MediaStorageName);
  const approvedPath = `${asset.folder}/${asset.userId}/${asset.id}-${randomUUID()}.${asset.extension}`;
  const controlledUrl = `/api/media/${asset.id}`;

  try {
    const contents = await downloadAssetForProcessing(asset);
    await provider.upload({ bucket: approvedBucket, path: approvedPath, contents, contentType: asset.detectedMimeType, overwrite: false });
    const result = await prisma.$transaction(async (tx) => {
      const current = await loadReviewableAsset(tx, assetId, asset.updatedAt.toISOString());
      if (current.status === "APPROVED") return current;
      const approved = await persistReview(tx, current, reviewerId, reason, "APPROVED", {
        status: "APPROVED", approvedBucket, approvedPath, controlledUrl, storageProvider: provider.name,
        approvedAt: new Date(), failureReason: null,
      });
      await ensureProfessionalPhotoReference(asset, controlledUrl, tx);
      return approved;
    }, { isolationLevel: "Serializable" });
    if (result.approvedPath !== approvedPath) {
      await provider.delete(approvedBucket, approvedPath).catch(() => undefined);
    } else {
      await provider.delete(asset.quarantineBucket, asset.quarantinePath).catch(() => undefined);
    }
    return result;
  } catch (cause) {
    const current = await prisma.uploadAsset.findUnique({ where: { id: assetId } }).catch(() => undefined);
    // A lost connection can conceal a committed transaction. Keep the private copy if the database is unreachable.
    if (current !== undefined && current?.approvedPath !== approvedPath) {
      await provider.delete(approvedBucket, approvedPath).catch(() => undefined);
    }
    if (current?.status === "APPROVED" && current.moderationStatus !== "REJECTED") return current;
    throw cause;
  }
}

async function recordNegativeReview(assetId: string, reviewerId: string, reason: string, decision: "REJECTED" | "ESCALATED", revision?: string) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.uploadAsset.findUniqueOrThrow({ where: { id: assetId } });
    if (asset.moderationStatus === decision && asset.adminReviewStatus === decision) return asset;
    checkReviewRevision(asset.updatedAt, revision);
    if (asset.status === "REJECTED") throw new Error("A mídia já foi rejeitada.");
    return persistReview(tx, asset, reviewerId, reason, decision, {
      status: decision === "REJECTED" ? "REJECTED" : "QUARANTINED",
      failureReason: reason,
      approvedAt: null,
      ...(decision === "REJECTED" ? { rejectedAt: new Date() } : {}),
    });
  });
}

export async function rejectUploadAsset(assetId: string, reviewerId: string, reason: string, revision?: string) {
  return recordNegativeReview(assetId, reviewerId, reason, "REJECTED", revision);
}

export async function escalateUploadAsset(assetId: string, reviewerId: string, reason: string, revision?: string) {
  return recordNegativeReview(assetId, reviewerId, reason, "ESCALATED", revision);
}
