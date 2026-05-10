export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// profiles/main  → bucket "profiles"  (público)
// profiles/gallery → bucket "profiles" (público)
// documentos     → bucket "documentos" (privado)
// verificacao    → bucket "documentos" (privado)
// stories        → bucket "stories"    (público, legado)
function resolveBucket(folder: string): { bucket: string; isPrivate: boolean } {
  if (folder.startsWith("documentos") || folder.startsWith("verificacao")) {
    return { bucket: "documentos", isPrivate: true };
  }
  if (folder.startsWith("profiles")) {
    return { bucket: "profiles", isPrivate: false };
  }
  return { bucket: "stories", isPrivate: false };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder") ?? "stories";

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  // Valida tamanho: fotos ≤ 10MB, vídeos ≤ 100MB
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Arquivo muito grande. Máximo: ${isVideo ? "100MB" : "10MB"}.` }, { status: 400 });
  }

  const { bucket, isPrivate } = resolveBucket(folder);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
  const path = `${folder}/${session.user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    // Tenta criar o bucket se não existir e reenviar
    if (error.message?.includes("Bucket not found")) {
      await supabase.storage.createBucket(bucket, { public: !isPrivate });
      const { error: e2 } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Documentos/verificação: não retorna URL pública
  if (isPrivate) {
    return NextResponse.json({
      path,
      url: `[private:${bucket}/${path}]`,
      type: isVideo ? "video" : "image",
    });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    type: isVideo ? "video" : "image",
    path,
  });
}
