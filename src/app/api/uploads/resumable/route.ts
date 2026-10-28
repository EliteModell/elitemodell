export const dynamic = "force-dynamic";

import { createHash, randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isAgeOfMajority } from "@/lib/age-validation";
import { PUBLICATION_LEGAL_KEYS, recordUserAcceptances } from "@/lib/legal-acceptance";
import { prisma } from "@/lib/prisma";
import { processUploadAsset } from "@/lib/upload-quarantine";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { inspectServerVideoDuration } from "@/lib/server-video-duration";
import { profileVideoDurationError, PROFILE_VIDEO_DURATION_UNKNOWN_ERROR } from "@/lib/video-duration-policy";

const BUCKET = "approved-media";
const MAX_RAW_VIDEO_BYTES = 500 * 1024 * 1024;
const ALLOWED_MIME = new Set(["video/mp4", "video/quicktime", "video/webm", "application/octet-stream"]);

const intentSchema = z.object({
  professionalId: z.string().min(1),
  fileName: z.string().min(1).max(240),
  fileSize: z.number().int().positive().max(MAX_RAW_VIDEO_BYTES),
  mimeType: z.string().min(1).max(100),
  contentRating: z.enum(["STANDARD", "ADULT_SUGGESTIVE", "ADULT_EXPLICIT"]).default("STANDARD"),
  contentDeclarationAccepted: z.literal(true),
});
const finalizeSchema = z.object({ assetId: z.string().uuid() });

function extensionFor(mime: string, name: string) {
  if (mime === "video/webm" || /\.webm$/i.test(name)) return "webm";
  if (mime === "video/quicktime" || /\.mov$/i.test(name)) return "mov";
  return "mp4";
}

function detectedVideo(buffer: Buffer) {
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    return brand.includes("qt") ? { mime: "video/quicktime", extension: "mov" } : { mime: "video/mp4", extension: "mp4" };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { mime: "video/webm", extension: "webm" };
  }
  return null;
}

async function authenticatedOwner(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, phone: true, birthDate: true, clientStatus: true, professional: { select: { id: true, verified: true, kycStatus: true } } },
  });
  if (!owner) return null;
  const linked = data.user.app_metadata?.prismaUserId === owner.id
    || (data.user.email && data.user.email.toLowerCase() === owner.email.toLowerCase())
    || (data.user.phone && owner.phone && data.user.phone.replace(/\D/g, "").endsWith(owner.phone.replace(/\D/g, "")));
  return linked ? { owner, authUserId: data.user.id } : null;
}

export async function POST(request: NextRequest) {
  const identity = await authenticatedOwner(request);
  if (!identity) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para enviar o vídeo." }, { status: 401 });
  const parsed = intentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Não foi possível preparar este vídeo. Escolha um arquivo MOV, MP4 ou WebM válido." }, { status: 400 });
  if (!ALLOWED_MIME.has(parsed.data.mimeType)) return NextResponse.json({ error: "Escolha um vídeo MOV, MP4 ou WebM." }, { status: 400 });
  const professional = identity.owner.professional;
  if (!professional || professional.id !== parsed.data.professionalId) return NextResponse.json({ error: "Este perfil não pertence à conta conectada." }, { status: 403 });
  const resumableSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingIntent = await prisma.uploadAsset.findFirst({
    where: {
      userId: identity.owner.id,
      folder: `profile-videos/${professional.id}`,
      category: "video",
      originalName: parsed.data.fileName,
      sizeBytes: parsed.data.fileSize,
      uploadCompletedAt: null,
      createdAt: { gte: resumableSince },
    },
    orderBy: { createdAt: "desc" },
  });
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectId = new URL(projectUrl).hostname.split(".")[0];
  if (existingIntent) {
    return NextResponse.json({
      assetId: existingIntent.id,
      bucket: existingIntent.quarantineBucket,
      objectName: existingIntent.quarantinePath,
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      resumed: true,
    });
  }
  const currentVideos = await prisma.professionalMedia.count({ where: { professionalId: professional.id, kind: "VIDEO", hiddenAt: null } });
  const pendingVideos = await prisma.uploadAsset.count({ where: { userId: identity.owner.id, folder: { startsWith: `profile-videos/${professional.id}` }, category: "video", uploadCompletedAt: null, createdAt: { gte: resumableSince } } });
  if (currentVideos + pendingVideos >= 10) return NextResponse.json({ error: "Você pode manter até 10 vídeos na galeria." }, { status: 409 });

  const id = randomUUID();
  const extension = extensionFor(parsed.data.mimeType, parsed.data.fileName);
  const objectName = `_processing/${identity.authUserId}/${identity.owner.id}/${id}.${extension}`;
  const ownerIsAdult = Boolean(identity.owner.birthDate && isAgeOfMajority(identity.owner.birthDate.toISOString().slice(0, 10)));
  const identityApproved = ownerIsAdult && (identity.owner.clientStatus === "VERIFIED" || (professional.verified && professional.kycStatus === "APPROVED"));
  if (parsed.data.contentRating !== "STANDARD" && !identityApproved) {
    return NextResponse.json({ error: "Conteúdo adulto exige identidade e maioridade aprovadas." }, { status: 403 });
  }
  await prisma.uploadAsset.create({
    data: {
      id,
      userId: identity.owner.id,
      originalName: parsed.data.fileName,
      folder: `profile-videos/${professional.id}`,
      category: "video",
      declaredMimeType: parsed.data.mimeType,
      detectedMimeType: parsed.data.mimeType,
      extension,
      sizeBytes: parsed.data.fileSize,
      fileHash: `pending:${id}`,
      status: "PROCESSING",
      quarantineBucket: BUCKET,
      quarantinePath: objectName,
      storageProvider: "SUPABASE",
      contentRating: parsed.data.contentRating,
      visibility: "PUBLIC",
      ageIdentityStatus: identityApproved ? "PASS" : "PENDING",
      consentStatus: "PASS",
      adminReviewRequired: true,
      adminReviewStatus: "PENDING",
      depictedPeople: { create: [{
        personReference: `user:${identity.owner.id}`,
        relationship: "SELF_DECLARED",
        isUploader: true,
        isContentOwner: true,
        ageStatus: identityApproved ? "PASS" : "PENDING",
        consentStatus: "PASS",
        verificationDate: identityApproved ? new Date() : null,
        consentReference: "content-authorization-declaration:0.4-ready-for-legal-review",
      }] },
    },
  });
  await Promise.all([
    recordUserAcceptances({
      userId: identity.owner.id,
      userCategory: "model",
      documentKeys: PUBLICATION_LEGAL_KEYS,
      source: "resumable-video-upload",
      acceptanceType: "CONTENT_UPLOAD",
      req: request,
    }),
    prisma.contentDeclaration.create({
      data: {
        userId: identity.owner.id,
        storageBucket: BUCKET,
        storagePath: objectName,
        fileHash: `pending:${id}`,
        declarationKey: "content-authorization-declaration",
        version: "0.4-ready-for-legal-review",
        statements: {
          authorIsAdult: true,
          authorizedPublication: true,
          noMinors: true,
          noExploitationCoercionOrTrafficking: true,
          noUnauthorizedThirdPartyImage: true,
          contentPolicyAccepted: true,
        },
        userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    }),
  ]);
  return NextResponse.json({ assetId: id, bucket: BUCKET, objectName, endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable` }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await authenticatedOwner(request);
  if (!identity) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para concluir o envio." }, { status: 401 });
  const parsed = finalizeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Não foi possível identificar o vídeo enviado." }, { status: 400 });
  const asset = await prisma.uploadAsset.findFirst({ where: { id: parsed.data.assetId, userId: identity.owner.id, uploadCompletedAt: null } });
  if (!asset) return NextResponse.json({ error: "Este envio já foi concluído ou não pertence à conta conectada." }, { status: 409 });
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(asset.quarantineBucket).download(asset.quarantinePath);
  if (error || !data) return NextResponse.json({ error: "O vídeo ainda não terminou de enviar. Aguarde e tente novamente." }, { status: 409 });
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length !== asset.sizeBytes || buffer.length > MAX_RAW_VIDEO_BYTES) {
    await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: "REJECTED", rejectedAt: new Date(), failureReason: "Tamanho recebido divergente da intenção de upload." } });
    await supabase.storage.from(asset.quarantineBucket).remove([asset.quarantinePath]);
    return NextResponse.json({ error: "O arquivo recebido está incompleto. Tente enviar novamente." }, { status: 422 });
  }
  const kind = detectedVideo(buffer);
  if (!kind) {
    await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: "REJECTED", rejectedAt: new Date(), failureReason: "Assinatura binária incompatível com vídeo permitido." } });
    await supabase.storage.from(asset.quarantineBucket).remove([asset.quarantinePath]);
    return NextResponse.json({ error: "O arquivo não é um vídeo MOV, MP4 ou WebM válido." }, { status: 422 });
  }
  const inspected = inspectServerVideoDuration(buffer, kind.mime);
  const durationError = profileVideoDurationError(inspected?.durationSeconds ?? null);
  if (durationError) {
    await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: "REJECTED", rejectedAt: new Date(), failureReason: inspected ? durationError : PROFILE_VIDEO_DURATION_UNKNOWN_ERROR } });
    await supabase.storage.from(asset.quarantineBucket).remove([asset.quarantinePath]);
    return NextResponse.json({ error: inspected ? durationError : PROFILE_VIDEO_DURATION_UNKNOWN_ERROR }, { status: 422 });
  }
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  await prisma.$transaction([
    prisma.uploadAsset.update({ where: { id: asset.id }, data: {
    detectedMimeType: kind.mime,
    extension: kind.extension,
    fileHash,
    uploadCompletedAt: new Date(),
    status: "PROCESSING",
    failureReason: null,
    } }),
    prisma.contentDeclaration.updateMany({
      where: { userId: asset.userId, storageBucket: asset.quarantineBucket, storagePath: asset.quarantinePath, revokedAt: null },
      data: { fileHash },
    }),
  ]);
  const processed = await processUploadAsset(asset.id, buffer);
  const professional = identity.owner.professional;
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });
  const currentVideos = await prisma.professionalMedia.count({ where: { professionalId: professional.id, kind: "VIDEO", hiddenAt: null } });
  await prisma.professionalMedia.upsert({
    where: { assetId: processed.id },
    create: { professionalId: professional.id, assetId: processed.id, kind: "VIDEO", order: currentVideos },
    update: { hiddenAt: null, hiddenReason: null },
  });
  return NextResponse.json({
    assetId: processed.id,
    path: `/api/media/${encodeURIComponent(processed.id)}`,
    url: processed.status === "APPROVED" ? processed.controlledUrl : null,
    status: processed.status,
    type: "video",
  }, { status: processed.status === "APPROVED" ? 200 : 202 });
}
