export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { KYC_LEGAL_KEYS, PUBLICATION_LEGAL_KEYS, recordUserAcceptances } from "@/lib/legal-acceptance";
import { requiresContentAuthorizationDeclaration } from "@/lib/legal-document-catalog";
import { processUploadAsset, quarantineUpload } from "@/lib/upload-quarantine";

// Tipos MIME permitidos por contexto. Alguns celulares enviam fotos validas com
// MIME vazio ou application/octet-stream; nesses casos a assinatura binaria decide.
const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_DOC   = [...ALLOWED_IMAGE, "application/pdf"];
const ALLOWED_VIDEO = [...ALLOWED_IMAGE, "video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_ROOT_FOLDERS = new Set(["verificacao", "documentos", "properties", "profiles", "profile-videos", "stories"]);

function normalizeFolder(folder: string) {
  const segments = folder
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => /^[a-zA-Z0-9_-]+$/.test(segment));
  const root = segments[0] && ALLOWED_ROOT_FOLDERS.has(segments[0]) ? segments[0] : "stories";
  return [root, ...segments.slice(1, 4)].join("/");
}

function headerText(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function isHeicHeifBrand(brand: string) {
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "heif", "mif1", "msf1"].includes(brand);
}

type FileKind = {
  mime: string;
  ext: string;
  category: "image" | "video" | "document";
};

async function detectFileKind(file: File): Promise<FileKind | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg", category: "image" };
  }
  if (bytes[0] === 0x89 && headerText(bytes, 1, 3) === "PNG") {
    return { mime: "image/png", ext: "png", category: "image" };
  }
  if (headerText(bytes, 0, 4) === "RIFF" && headerText(bytes, 8, 4) === "WEBP") {
    return { mime: "image/webp", ext: "webp", category: "image" };
  }
  if (headerText(bytes, 0, 4) === "%PDF") {
    return { mime: "application/pdf", ext: "pdf", category: "document" };
  }
  if (headerText(bytes, 4, 4) === "ftyp") {
    const brand = headerText(bytes, 8, 4).toLowerCase();
    if (isHeicHeifBrand(brand)) {
      return { mime: brand === "heif" || brand === "mif1" ? "image/heif" : "image/heic", ext: "heic", category: "image" };
    }
    const mime = brand.includes("qt") ? "video/quicktime" : "video/mp4";
    return { mime, ext: mime === "video/quicktime" ? "mov" : "mp4", category: "video" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mime: "video/webm", ext: "webm", category: "video" };
  }
  return null;
}

// Mapeamento folder → bucket + configurações
function resolveBucket(folder: string): {
  isPrivate: boolean;
  maxBytes: number;
  allowedTypes: string[];
} {
  if (folder.startsWith("verificacao")) {
    return { isPrivate: true,  maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
  }
  if (folder.startsWith("documentos")) {
    return { isPrivate: true,  maxBytes: 10 * 1024 * 1024, allowedTypes: ALLOWED_DOC   };
  }
  if (folder.startsWith("properties")) {
    return { isPrivate: false, maxBytes: 20 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
  }
  if (folder.startsWith("profiles")) {
    return { isPrivate: false, maxBytes: 20 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
  }
  if (folder.startsWith("profile-videos")) {
    return { isPrivate: false, maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
  }
  return { isPrivate: false, maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
}

function legalKeysForUpload(folder: string) {
  return folder.startsWith("documentos") || folder.startsWith("verificacao")
    ? KYC_LEGAL_KEYS
    : PUBLICATION_LEGAL_KEYS;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const requestIp = getClientIP(req);
  const limited = await enforceRateLimitAsync(
    `upload:${session.user.id}:${requestIp}`,
    40,
    15 * 60 * 1000,
    "Muitos uploads em pouco tempo. Tente novamente em instantes."
  );
  if (limited) return limited;

  const url    = new URL(req.url);
  const folder = normalizeFolder(url.searchParams.get("folder") ?? "stories");

  if (folder.startsWith("stories")) {
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id },
      select: { status: true, verified: true },
    });
    if (!professional || professional.status !== "ACTIVE" || !professional.verified) {
      return NextResponse.json({ error: "Upload de stories exclusivo para profissionais aprovadas." }, { status: 403 });
    }
  }

  if (folder.startsWith("profile-videos")) {
    const requestedProfessionalId = folder.split("/").filter(Boolean)[1];
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!professional || professional.id !== requestedProfessionalId) {
      return NextResponse.json({ error: "Upload de video permitido apenas para o proprio perfil profissional." }, { status: 403 });
    }
  }

  const formData = await req.formData();
  const contentDeclarationAccepted = formData.get("contentDeclarationAccepted") === "true";
  if (requiresContentAuthorizationDeclaration(folder) && !contentDeclarationAccepted) {
    return NextResponse.json(
      { error: "Confirme a declaracao de autoria e autorizacao antes do upload." },
      { status: 400 },
    );
  }
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const { isPrivate, maxBytes, allowedTypes } = resolveBucket(folder);

  const detectedKind = await detectFileKind(file);
  const effectiveMime = detectedKind?.mime ?? file.type;
  const isGenericMobileMime = !file.type || file.type === "application/octet-stream";

  // Valida tipo MIME com fallback por assinatura para fotos reais de celular.
  if (!allowedTypes.includes(effectiveMime) || (!detectedKind && isGenericMobileMime)) {
    console.warn("[upload] tipo de arquivo recusado", {
      folder,
      declaredType: file.type || null,
      detectedType: detectedKind?.mime ?? null,
      size: file.size,
    });
    return NextResponse.json(
      { error: `Tipo de arquivo não permitido: ${file.type || "desconhecido"}. Aceitos: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Valida tamanho
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return NextResponse.json({ error: `Arquivo muito grande. Máximo: ${mb}MB.` }, { status: 400 });
  }

  // Sanitiza extensao por assinatura, impedindo spoof de MIME/extensao.
  if (!detectedKind) {
    console.warn("[upload] assinatura binaria recusada", {
      folder,
      declaredType: file.type || null,
      size: file.size,
    });
    return NextResponse.json({ error: "Arquivo rejeitado: assinatura binaria nao corresponde ao tipo informado." }, { status: 400 });
  }

  const ext = detectedKind.ext;
  const propertyId = folder.startsWith("properties/")
    ? folder.split("/").filter(Boolean)[1]
    : null;
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const storageFolder = propertyId
      ? `properties/${propertyId}`
      : folder;
    const quarantined = await quarantineUpload({
      userId: session.user.id,
      originalName: file.name || `upload.${ext}`,
      folder: storageFolder,
      category: detectedKind.category,
      declaredMimeType: file.type || null,
      detectedMimeType: effectiveMime,
      extension: ext,
      buffer,
    });
    const processed = await processUploadAsset(quarantined.id, buffer);
    const type = detectedKind.category === "video" ? "video" : "image";
    if (processed.status !== "REJECTED") {
      await recordUserAcceptances({
        userId: session.user.id,
        userCategory: session.user.accountType,
        documentKeys: legalKeysForUpload(folder),
        source: "upload",
        acceptanceType: "CONTENT_UPLOAD",
        req,
      });
      if (requiresContentAuthorizationDeclaration(folder)) {
        await prisma.contentDeclaration.create({
          data: {
            userId: session.user.id,
            storageBucket: processed.approvedBucket ?? processed.quarantineBucket,
            storagePath: processed.approvedPath ?? processed.quarantinePath,
            fileHash: processed.fileHash,
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
            ipAddress: requestIp,
            userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
          },
        }).catch((error) => {
          console.error("[upload] falha ao registrar declaracao de conteudo", {
            assetId: processed.id,
            userId: session.user.id,
            error,
          });
        });
      }
    }

    if (processed.status === "APPROVED" && processed.controlledUrl) {
      if (isPrivate) {
        return NextResponse.json({
          assetId: processed.id,
          path: `asset:${processed.id}`,
          url: null,
          status: processed.status,
          type,
        });
      }
      return NextResponse.json({
        assetId: processed.id,
        path: `asset:${processed.id}`,
        url: new URL(processed.controlledUrl, req.url).toString(),
        status: processed.status,
        type,
      });
    }

    if (processed.status === "REJECTED") {
      return NextResponse.json(
        {
          assetId: processed.id,
          status: processed.status,
          error: "Arquivo rejeitado pela verificacao de seguranca.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        assetId: processed.id,
        path: isPrivate ? `asset:${processed.id}` : null,
        url: null,
        status: processed.status,
        malwareStatus: processed.malwareStatus,
        moderationStatus: processed.moderationStatus,
        type,
        message: "Arquivo mantido em quarentena e aguardando revisao.",
      },
      { status: 202 },
    );
  } catch (cause) {
    console.error("[upload] falha no fluxo de quarentena", cause);
    return NextResponse.json(
      { error: "Nao foi possivel processar o arquivo com seguranca." },
      { status: 500 },
    );
  }
}
