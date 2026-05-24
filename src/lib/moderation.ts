/**
 * Moderação de conteúdo e varredura de malware.
 *
 * Integrar futuramente com:
 *   - Imagens: Cloudflare Images AI, AWS Rekognition, Google Cloud Vision SafeSearch
 *   - Arquivos: VirusTotal API, ClamAV (servidor separado), Cloudflare Gateway AV
 *
 * Ativar:
 *   MODERATION_ENABLED=true   (moderação de imagens)
 *   AV_ENABLED=true           (varredura de vírus)
 *
 * Enquanto desativadas, todas as chamadas retornam { safe: true } (bypass dev).
 */

export type ModerationResult = { safe: boolean; reason?: string };

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function moderationProviderConfigured() {
  return Boolean(
    process.env.AWS_REKOGNITION_REGION ||
    process.env.GOOGLE_CLOUD_VISION_KEY ||
    process.env.CLOUDFLARE_MODERATION_ENDPOINT
  );
}

function antivirusProviderConfigured() {
  return Boolean(process.env.VIRUSTOTAL_API_KEY || process.env.CLAMAV_HOST);
}

/**
 * Verifica se uma imagem contém conteúdo impróprio (nudez, violência, etc.).
 * @param url - URL pública ou signed URL da imagem a verificar.
 */
export async function moderateImage(url: string): Promise<ModerationResult> {
  if (process.env.MODERATION_ENABLED !== "true") {
    return isProductionRuntime()
      ? { safe: false, reason: "MODERATION_ENABLED precisa estar true em producao para uploads publicos." }
      : { safe: true };
  }

  if (isProductionRuntime() && !moderationProviderConfigured()) {
    return { safe: false, reason: "Nenhum provedor de moderacao configurado em producao." };
  }

  // TODO: substituir pelo provedor escolhido.
  //
  // Exemplo com Cloudflare Workers AI (requer Workers com binding AI):
  //   POST /ai/run/@cf/unum/uform-gen2-qwen-500m
  //   body: { image_url: url, prompt: "Is this image safe for work?" }
  //
  // Exemplo com AWS Rekognition (requer SDK):
  //   const { Labels } = await rekognition.detectModerationLabels({ Image: { ... } })
  //   const unsafe = Labels.some(l => l.Confidence > 80)
  //
  void url;
  return { safe: true };
}

/**
 * Varre um buffer de arquivo em busca de malware.
 * @param buffer - Conteúdo do arquivo como Buffer.
 * @param filename - Nome original do arquivo (para logging).
 */
export async function scanFileForVirus(
  buffer: Buffer,
  filename = "upload"
): Promise<ModerationResult> {
  if (process.env.AV_ENABLED !== "true") {
    return isProductionRuntime()
      ? { safe: false, reason: "AV_ENABLED precisa estar true em producao para uploads." }
      : { safe: true };
  }

  if (isProductionRuntime() && !antivirusProviderConfigured()) {
    return { safe: false, reason: "Nenhum provedor de antivirus configurado em producao." };
  }

  // TODO: substituir pelo provedor escolhido.
  //
  // Exemplo com VirusTotal (requer VIRUSTOTAL_API_KEY):
  //   1. Upload: POST https://www.virustotal.com/api/v3/files
  //   2. Aguarda análise: GET /analyses/{id}
  //   3. Verifica: data.attributes.stats.malicious === 0
  //
  // Exemplo com ClamAV via TCP (requer servidor ClamAV separado):
  //   const NodeClam = require('clamscan')
  //   const clam = await new NodeClam().init({ clamdscan: { host: process.env.CLAMAV_HOST } })
  //   const { isInfected } = await clam.scanBuffer(buffer)
  //
  void buffer;
  void filename;
  return { safe: true };
}
