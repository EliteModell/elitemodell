export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { processUploadAsset, quarantineUpload } from "@/lib/upload-quarantine";

const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

function detectImage(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (
    buffer[0] === 0x89 &&
    buffer.subarray(1, 4).toString("ascii") === "PNG"
  ) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(buffer);
    if (!detected || detected.mimeType !== file.type.replace("image/jpg", "image/jpeg")) {
      return NextResponse.json(
        { error: "A assinatura binaria nao corresponde ao tipo da imagem." },
        { status: 400 },
      );
    }

    const quarantined = await quarantineUpload({
      userId: session.user.id,
      originalName: file.name || `avatar.${detected.extension}`,
      folder: "profiles/avatars",
      category: "image",
      declaredMimeType: file.type,
      detectedMimeType: detected.mimeType,
      extension: detected.extension,
      buffer,
    });
    const processed = await processUploadAsset(quarantined.id, buffer);
    if (processed.status !== "APPROVED" || !processed.controlledUrl) {
      if (processed.status === "REJECTED") {
        return NextResponse.json(
          { assetId: processed.id, status: processed.status, error: "Imagem rejeitada pela seguranca." },
          { status: 422 },
        );
      }
      return NextResponse.json(
        {
          assetId: processed.id,
          status: processed.status,
          message: "Imagem em quarentena aguardando revisao.",
        },
        { status: 202 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: processed.controlledUrl },
      select: { id: true, image: true },
    });

    return NextResponse.json({
      ok: true,
      assetId: processed.id,
      status: processed.status,
      image: user.image,
    });
  } catch (err) {
    console.error("[avatar]", err);
    return NextResponse.json({ error: "Não foi possível atualizar a foto." }, { status: 500 });
  }
}
