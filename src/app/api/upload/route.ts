export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 500 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("upload_preset", "elitemodell_stories");
  uploadData.append("folder", "stories");

  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: uploadData,
  });

  if (!res.ok) return NextResponse.json({ error: "Erro no upload." }, { status: 500 });

  const data = await res.json();
  return NextResponse.json({
    url: data.secure_url,
    type: resourceType,
    thumbnail: resourceType === "video" ? data.secure_url.replace("/upload/", "/upload/so_0/") : null,
  });
}
