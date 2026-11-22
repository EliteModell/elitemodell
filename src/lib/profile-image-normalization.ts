import sharp from "sharp";

export class ProfileImageValidationError extends Error {}

export async function normalizeProfileImage(buffer: Buffer) {
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw new Error("Tamanho de imagem inválido.");
  const image = sharp(buffer, { limitInputPixels: 32_000_000, failOn: "warning" });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp", "heif"].includes(meta.format ?? "") ||
      (meta.format === "heif" && meta.compression !== "hevc") ||
      (meta.pages ?? 1) !== 1 || !meta.width || !meta.height) throw new Error("Formato de imagem inválido.");
  // Always encode fresh pixels; original metadata and trailing bytes never reach the approved object.
  const normalized = await image.rotate().resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#fff" }).jpeg({ quality: 88 }).toBuffer();
  if (!normalized.length || normalized.length > 20 * 1024 * 1024) throw new Error("Imagem regravada acima do limite.");
  return normalized;
}
