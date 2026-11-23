const jpeg = "image/jpeg";
const heifBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "heif", "mif1", "msf1"];

export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function detectUploadImage(bytes: Uint8Array) {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: jpeg, ext: "jpg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return { mime: "image/png", ext: "png" };
  }
  if (text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return { mime: "image/webp", ext: "webp" };
  const brand = text(8, 4).toLowerCase();
  if (text(4, 4) === "ftyp" && heifBrands.includes(brand)) {
    return { mime: brand === "heif" || brand === "mif1" ? "image/heif" : "image/heic", ext: "heic" };
  }
  return null;
}

export function imageMimeMatches(declared: string, detected: string) {
  const mime = declared.toLowerCase().trim();
  if (!mime || mime === "application/octet-stream") return true;
  if ((mime === "image/jpg" || mime === "image/pjpeg") && detected === jpeg) return true;
  if (/^image\/hei[cf]$/.test(mime) && /^image\/hei[cf]$/.test(detected)) return true;
  return mime === detected;
}
