import sharp from "sharp";
import { MAX_IDENTITY_IMAGE } from "@/lib/manual-identity-policy";

export async function normalizeIdentityImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MAX_IDENTITY_IMAGE) {
    throw new Error("Envie uma imagem JPEG, PNG ou WebP de até 1,25 MB.");
  }
  const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 12_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) !== 1 ||
      (metadata.width ?? 0) < 480 || (metadata.height ?? 0) < 480) {
    throw new Error("Imagem inválida ou pequena demais.");
  }
  const cleaned = await image.rotate().jpeg({ quality: 88 }).toBuffer();
  if (cleaned.length > 6_000_000) throw new Error("Imagem acima do limite de armazenamento.");
  return cleaned;
}
