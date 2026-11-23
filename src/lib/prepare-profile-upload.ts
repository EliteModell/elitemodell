import { detectUploadImage, imageMimeMatches } from "./upload-image-format";

export const PROFILE_IMAGE_MULTIPART_BYTES = 4_000_000;

export function profileImageSelectionError(file: File, maxBytes: number) {
  if (!file.size) return "Escolha uma imagem válida.";
  if (file.size > maxBytes) return `Use uma imagem de até ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  if (!["", "application/octet-stream", "image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type.toLowerCase())) {
    return "Use uma foto em JPG, PNG, WebP ou HEIC/HEIF.";
  }
  return null;
}

async function isAnimatedForConversion(file: File, mime: string, header: Uint8Array) {
  if (mime === "image/webp") {
    return String.fromCharCode(...header.subarray(12, 16)) === "VP8X" && Boolean(header[20] & 2);
  }
  if (mime !== "image/png") return false;
  let offset = 8;
  for (let chunks = 0; chunks < 128 && offset + 12 <= file.size; chunks++) {
    const entry = new DataView(await file.slice(offset, offset + 8).arrayBuffer());
    const type = entry.getUint32(4);
    if (type === 0x6163544c) return true; // acTL must precede image data.
    if (type === 0x49444154) return false; // IDAT
    offset += entry.getUint32(0) + 12;
  }
  throw new Error("A estrutura do PNG é inválida ou complexa demais.");
}

export async function prepareProfileImageUpload(file: File, maxBytes: number) {
  const error = profileImageSelectionError(file, maxBytes);
  if (error) throw new Error(error);
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const image = detectUploadImage(header);
  if (!image || !imageMimeMatches(file.type, image.mime)) throw new Error("O conteúdo do arquivo não corresponde a uma imagem compatível.");
  const heif = image.ext === "heic";
  if (!heif && file.size <= PROFILE_IMAGE_MULTIPART_BYTES) return file;
  if (await isAnimatedForConversion(file, image.mime, header)) throw new Error("Envie uma foto estática.");

  const originalUrl = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");
  try {
    const source = new Image();
    source.src = originalUrl;
    await source.decode().catch(() => {
      throw new Error(heif
        ? "Este navegador não conseguiu abrir a foto HEIC. No iPhone, tente pelo Safari ou tire uma nova foto pela câmera."
        : "Não foi possível abrir esta imagem. Escolha outra foto.");
    });
    if (!source.naturalWidth || !source.naturalHeight || source.naturalWidth * source.naturalHeight > 32_000_000) {
      throw new Error("A foto excede o limite de 32 megapixels.");
    }
    const scale = Math.min(1, 4096 / Math.max(source.naturalWidth, source.naturalHeight));
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.92, 0.84, 0.76]) {
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (compressed?.type === "image/jpeg" && compressed.size > 0 && compressed.size <= PROFILE_IMAGE_MULTIPART_BYTES) {
        return new File([compressed], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, { type: "image/jpeg" });
      }
    }
    throw new Error("A foto é grande demais para enviar. Tente uma imagem com menor resolução.");
  } finally {
    URL.revokeObjectURL(originalUrl);
    canvas.width = canvas.height = 0;
  }
}
