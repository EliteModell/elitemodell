export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tipos MIME permitidos por contexto
const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_DOC   = [...ALLOWED_IMAGE, "application/pdf"];
const ALLOWED_VIDEO = [...ALLOWED_IMAGE, "video/mp4", "video/webm", "video/quicktime"];

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

  const url    = new URL(req.url);
  const folder = url.searchParams.get("folder") ?? "stories";

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
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  const ext = mimeToExt[file.type] ?? "bin";
  const propertyId = folder.startsWith("properties/")
    ? folder.split("/").filter(Boolean)[1]
    : null;
  const path = propertyId
    ? `properties/${session.user.id}/${propertyId}/${Date.now()}.${ext}`
    : `${folder}/${session.user.id}/${Date.now()}.${ext}`;
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
