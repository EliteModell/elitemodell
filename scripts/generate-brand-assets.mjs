import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const brandDir = path.join(publicDir, "brand");
const appDir = path.join(root, "src", "app");
const symbolSvg = await readFile(path.join(brandDir, "elite-modell-icon.svg"));
const horizontalLogo = await readFile(path.join(brandDir, "elite-modell-logo-transparent.svg"));
const modelPath = path.join(publicDir, "images", "home", "modelo-elite.jpg");

await mkdir(brandDir, { recursive: true });

async function renderSymbol(size, { background = null, scale = 0.84 } = {}) {
  const symbolSize = Math.round(size * scale);
  const symbol = await sharp(symbolSvg).resize(symbolSize, symbolSize, { fit: "contain" }).png().toBuffer();
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const offset = Math.floor((size - symbolSize) / 2);
  const rendered = canvas.composite([{ input: symbol, left: offset, top: offset }]);
  if (background) rendered.removeAlpha();
  return rendered.png({ compressionLevel: 9 }).toBuffer();
}

function createIco(entries) {
  const headerSize = 6 + entries.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = headerSize;
  entries.forEach(({ size, buffer }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...entries.map(({ buffer }) => buffer)]);
}

const faviconEntries = [];
for (const size of [16, 32, 48]) {
  const buffer = await renderSymbol(size, { scale: size === 16 ? 0.94 : 0.88 });
  faviconEntries.push({ size, buffer });
  await writeFile(path.join(publicDir, `favicon-${size}x${size}.png`), buffer);
}

const faviconIco = createIco(faviconEntries);
await Promise.all([
  writeFile(path.join(publicDir, "favicon.ico"), faviconIco),
  writeFile(path.join(appDir, "favicon.ico"), faviconIco),
]);

const appleIcon = await renderSymbol(180, { background: "#FFFFFF", scale: 0.76 });
const android192 = await renderSymbol(192, { background: "#FFFFFF", scale: 0.74 });
const android512 = await renderSymbol(512, { background: "#FFFFFF", scale: 0.74 });

await Promise.all([
  writeFile(path.join(publicDir, "apple-touch-icon.png"), appleIcon),
  writeFile(path.join(brandDir, "elite-modell-apple-touch-icon.png"), appleIcon),
  writeFile(path.join(appDir, "apple-icon.png"), appleIcon),
  writeFile(path.join(publicDir, "android-chrome-192x192.png"), android192),
  writeFile(path.join(brandDir, "elite-modell-icon-192.png"), android192),
  writeFile(path.join(publicDir, "android-chrome-512x512.png"), android512),
  writeFile(path.join(brandDir, "elite-modell-icon-512.png"), android512),
  writeFile(path.join(appDir, "icon.png"), android512),
]);

const model = await sharp(modelPath)
  .resize(470, 630, { fit: "cover", position: "centre" })
  .modulate({ saturation: 0.92, brightness: 1.02 })
  .toBuffer();
const logo = await sharp(horizontalLogo).resize(610, 178, { fit: "contain" }).png().toBuffer();
const socialBackground = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFFFFF"/>
        <stop offset="0.62" stop-color="#FBF7FF"/>
        <stop offset="1" stop-color="#EFE2FF"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#background)"/>
  </svg>
`);
const socialOverlay = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect x="370" width="180" height="630" fill="url(#fade)"/>
    <text x="555" y="350" fill="#2F2440" font-family="Arial, sans-serif" font-size="42" font-weight="700">Conexões Discretas e Seguras</text>
    <text x="555" y="414" fill="#635873" font-family="Arial, sans-serif" font-size="25">Perfis verificados, privacidade e liberdade</text>
    <text x="555" y="450" fill="#635873" font-family="Arial, sans-serif" font-size="25">para escolher do seu jeito.</text>
    <rect x="555" y="505" width="270" height="3" rx="1.5" fill="#7B1FFF"/>
    <text x="555" y="552" fill="#7B1FFF" font-family="Arial, sans-serif" font-size="22" font-weight="700">elitemodell.com.br</text>
  </svg>
`);

const socialImage = await sharp(socialBackground)
  .composite([
    { input: model, left: 0, top: 0 },
    { input: socialOverlay, left: 0, top: 0 },
    { input: logo, left: 540, top: 105 },
  ])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer();

await Promise.all([
  writeFile(path.join(publicDir, "og-image.png"), socialImage),
  writeFile(path.join(appDir, "opengraph-image.png"), socialImage),
  writeFile(path.join(appDir, "twitter-image.png"), socialImage),
]);

console.log("Elite Modell brand assets generated from the official vector mascot.");
