export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhuma imagem foi enviada." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE.includes(file.type)) {
      return NextResponse.json({ error: "Envie uma imagem JPG, PNG ou WebP." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Use uma imagem de até 8MB." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const ext = extensionFor(file.type);
    const path = `avatars/${session.user.id}/profile-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[avatar/upload]", uploadError);
      return NextResponse.json({ error: "Não foi possível salvar a foto. Tente novamente." }, { status: 500 });
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    const image = `${data.publicUrl}?v=${Date.now()}`;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
      select: { id: true, image: true },
    });

    return NextResponse.json({ ok: true, image: user.image });
  } catch (err) {
    console.error("[avatar]", err);
    return NextResponse.json({ error: "Não foi possível atualizar a foto." }, { status: 500 });
  }
}
