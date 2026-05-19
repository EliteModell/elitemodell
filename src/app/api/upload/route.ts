export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit, getClientIP } from "@/lib/security";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tipos MIME permitidos por contexto
const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_DOC   = [...ALLOWED_IMAGE, "application/pdf"];
const ALLOWED_VIDEO = [...ALLOWED_IMAGE, "video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_ROOT_FOLDERS = new Set(["verificacao", "documentos", "properties", "profiles", "stories"]);

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

async function hasExpectedSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") return bytes[0] === 0x89 && headerText(bytes, 1, 3) === "PNG";
  if (file.type === "image/webp") return headerText(bytes, 0, 4) === "RIFF" && headerText(bytes, 8, 4) === "WEBP";
  if (file.type === "application/pdf") return headerText(bytes, 0, 4) === "%PDF";
  if (file.type === "video/mp4" || file.type === "video/quicktime") return headerText(bytes, 4, 4) === "ftyp";
  if (file.type === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return false;
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
    return { bucket: "properties", isPrivate: false, maxBytes: 10 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
  }
  if (folder.startsWith("profiles")) {
    return { bucket: "profiles",   isPrivate: false, maxBytes: 10 * 1024 * 1024, allowedTypes: ALLOWED_IMAGE };
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
  const limited = enforceRateLimit(
    `upload:${session.user.id}:${requestIp}`,
    40,
    15 * 60 * 1000,
    "Muitos uploads em pouco tempo. Tente novamente em instantes."
  );
  if (limited) return limited;

  const url    = new URL(req.url);
  const folder = normalizeFolder(url.searchParams.get("folder") ?? "stories");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const { bucket, isPrivate, maxBytes, allowedTypes } = resolveBucket(folder);

  // Valida tipo MIME
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não permitido: ${file.type}. Aceitos: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Valida tamanho
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return NextResponse.json({ error: `Arquivo muito grande. Máximo: ${mb}MB.` }, { status: 400 });
  }

  // Sanitiza extensão
  if (!(await hasExpectedSignature(file))) {
    return NextResponse.json({ error: "Arquivo rejeitado: assinatura binaria nao corresponde ao tipo informado." }, { status: 400 });
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  const ext = mimeToExt[file.type] ?? "bin";
  const propertyId = folder.startsWith("properties/")
    ? folder.split("/").filter(Boolean)[1]
    : null;
  const filename = `${Date.now()}-${globalThis.crypto.randomUUID()}.${ext}`;
  const path = propertyId
    ? `properties/${session.user.id}/${propertyId}/${filename}`
    : `${folder}/${session.user.id}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error(`[upload] bucket=${bucket} path=${path} err=${error.message}`);
    return NextResponse.json({ error: "Erro ao salvar arquivo. Tente novamente." }, { status: 500 });
  }

  // Documentos privados: retorna apenas o path (URL gerada via signed URL na hora de exibir)
  if (isPrivate) {
    return NextResponse.json({ path, url: null, type: file.type.startsWith("video/") ? "video" : "image" });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url:  data.publicUrl,
    path,
    type: file.type.startsWith("video/") ? "video" : "image",
  });
}
