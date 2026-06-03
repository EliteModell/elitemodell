export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import { moderateImage, scanFileForVirus } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  bucket: string;
  isPrivate: boolean;
  maxBytes: number;
  allowedTypes: string[];
} {
  if (folder.startsWith("verificacao")) {
    return { bucket: "documentos", isPrivate: true,  maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
  }
  if (folder.startsWith("documentos")) {
    return { bucket: "documentos", isPrivate: true,  maxBytes: 10 * 1024 * 1024, allowedTypes: ALLOWED_DOC   };
  }
  if (folder.startsWith("properties")) {
    return { bucket: "properties", isPrivate: false, maxBytes: 20 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
  }
  if (folder.startsWith("profiles")) {
    return { bucket: "profiles",   isPrivate: false, maxBytes: 20 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
  }
  if (folder.startsWith("profile-videos")) {
    return { bucket: "profiles",   isPrivate: false, maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
  }
  // stories (legado + novos)
  return   { bucket: "stories",    isPrivate: false, maxBytes: 50 * 1024 * 1024, allowedTypes: ALLOWED_VIDEO };
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
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const { bucket, isPrivate, maxBytes, allowedTypes } = resolveBucket(folder);

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
      originalName: file.name || null,
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
      originalName: file.name || null,
    });
    return NextResponse.json({ error: "Arquivo rejeitado: assinatura binaria nao corresponde ao tipo informado." }, { status: 400 });
  }

  const ext = detectedKind.ext;
  const propertyId = folder.startsWith("properties/")
    ? folder.split("/").filter(Boolean)[1]
    : null;
  const filename = `${Date.now()}-${globalThis.crypto.randomUUID()}.${ext}`;
  const path = propertyId
    ? `properties/${session.user.id}/${propertyId}/${filename}`
    : `${folder}/${session.user.id}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const virusScan = await scanFileForVirus(buffer, file.name || filename);
  if (!virusScan.safe) {
    console.warn("[upload] arquivo bloqueado pela varredura", {
      bucket,
      folder,
      type: file.type,
      reason: virusScan.reason,
    });
    return NextResponse.json(
      { error: "Arquivo bloqueado pela verificacao de seguranca." },
      { status: 422 }
    );
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: effectiveMime, upsert: false });

  if (error) {
    console.error(`[upload] bucket=${bucket} path=${path} err=${error.message}`);
    return NextResponse.json({ error: "Erro ao salvar arquivo. Tente novamente." }, { status: 500 });
  }

  // Documentos privados: retorna apenas o path (URL gerada via signed URL na hora de exibir)
  if (isPrivate) {
    return NextResponse.json({ path, url: null, type: detectedKind.category === "video" ? "video" : "image" });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (detectedKind.category === "image") {
    const moderation = await moderateImage(data.publicUrl);
    if (!moderation.safe) {
      await supabase.storage.from(bucket).remove([path]).catch(() => undefined);
      console.warn("[upload] imagem bloqueada pela moderacao", {
        bucket,
        folder,
        type: effectiveMime,
        reason: moderation.reason,
      });
      return NextResponse.json(
        { error: "Imagem bloqueada pela verificacao de seguranca." },
        { status: 422 }
      );
    }
  }

  return NextResponse.json({
    url:  data.publicUrl,
    path,
    type: detectedKind.category === "video" ? "video" : "image",
  });
}
