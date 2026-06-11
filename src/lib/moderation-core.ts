import net from "node:net";

export type SecurityStatus =
  | "CLEAN"
  | "APPROVED"
  | "REJECTED"
  | "INFECTED"
  | "PENDING"
  | "ERROR";

export type SecurityResult = {
  safe: boolean;
  status: SecurityStatus;
  provider: string;
  providerVersion?: string;
  reason?: string;
  details?: Record<string, unknown>;
};

type ProviderOptions = {
  provider?: string;
  timeoutMs?: number;
};

function normalizedProvider(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase();
}

function pending(provider: string, reason: string): SecurityResult {
  return { safe: false, status: "PENDING", provider, reason };
}

function errorResult(provider: string, reason: string): SecurityResult {
  return { safe: false, status: "ERROR", provider, reason };
}

async function scanWithClamAv(
  buffer: Buffer,
  timeoutMs: number,
): Promise<SecurityResult> {
  const host = process.env.CLAMAV_HOST?.trim();
  const port = Number(process.env.CLAMAV_PORT || 3310);
  const providerVersion = process.env.CLAMAV_VERSION?.trim() || undefined;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return pending("CLAMAV", "CLAMAV_HOST/CLAMAV_PORT nao configurados.");
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (result: SecurityResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => {
      finish(errorResult("CLAMAV", `Timeout de ${timeoutMs}ms na varredura.`));
    });
    socket.on("error", (cause) => {
      finish(errorResult("CLAMAV", `Falha de conexao com ClamAV: ${cause.message}`));
    });
    socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on("end", () => {
      const response = Buffer.concat(chunks).toString("utf8").replace(/\0/g, "").trim();
      if (/\bOK$/i.test(response)) {
        finish({
          safe: true,
          status: "CLEAN",
          provider: "CLAMAV",
          providerVersion,
          details: { response },
        });
        return;
      }
      if (/\bFOUND$/i.test(response)) {
        finish({
          safe: false,
          status: "INFECTED",
          provider: "CLAMAV",
          providerVersion,
          reason: response,
          details: { response },
        });
        return;
      }
      finish(errorResult("CLAMAV", response || "Resposta vazia do ClamAV."));
    });

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.length, 0);
        socket.write(length);
        socket.write(chunk);
      }
      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      socket.end(end);
    });
  });
}

async function scanWithHttpProvider(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  endpointName: "AV_HTTP_ENDPOINT" | "CONTENT_MODERATION_ENDPOINT",
  tokenName: "AV_HTTP_TOKEN" | "CONTENT_MODERATION_TOKEN",
  provider: string,
  timeoutMs: number,
): Promise<SecurityResult> {
  const endpoint = process.env[endpointName]?.trim();
  if (!endpoint) return pending(provider, `${endpointName} nao configurado.`);

  const form = new FormData();
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  form.set("file", new Blob([bytes.buffer], { type: mimeType }), filename);
  const token = process.env[tokenName]?.trim();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  const json = await response.json().catch(() => null) as {
    safe?: boolean;
    status?: string;
    reason?: string;
    provider?: string;
    version?: string;
    labels?: unknown;
  } | null;

  if (!response.ok || !json || typeof json.safe !== "boolean") {
    return errorResult(provider, `Fornecedor respondeu HTTP ${response.status} sem decisao valida.`);
  }

  return {
    safe: json.safe,
    status: json.safe ? "APPROVED" : "REJECTED",
    provider: json.provider?.trim() || provider,
    providerVersion: json.version?.trim() || undefined,
    reason: json.reason,
    details: json.labels === undefined ? undefined : { labels: json.labels },
  };
}

export async function scanFileForVirus(
  buffer: Buffer,
  filename = "upload",
  mimeType = "application/octet-stream",
  options: ProviderOptions = {},
): Promise<SecurityResult> {
  const provider = normalizedProvider(
    options.provider || process.env.UPLOAD_AV_PROVIDER,
    "CLAMAV",
  );
  const timeoutMs = options.timeoutMs ?? Number(process.env.AV_TIMEOUT_MS || 30_000);

  if (process.env.AV_ENABLED === "false" || provider === "MANUAL" || provider === "NONE") {
    return pending(provider, "Varredura antimalware automatica desativada; revisao obrigatoria.");
  }

  try {
    if (provider === "CLAMAV") return await scanWithClamAv(buffer, timeoutMs);
    if (provider === "HTTP") {
      return await scanWithHttpProvider(
        buffer,
        filename,
        mimeType,
        "AV_HTTP_ENDPOINT",
        "AV_HTTP_TOKEN",
        "HTTP_AV",
        timeoutMs,
      );
    }
    return pending(provider, `Fornecedor antimalware nao suportado: ${provider}.`);
  } catch (cause) {
    return errorResult(
      provider,
      cause instanceof Error ? cause.message : "Falha desconhecida na varredura antimalware.",
    );
  }
}

export async function moderateFileContent(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: ProviderOptions = {},
): Promise<SecurityResult> {
  const provider = normalizedProvider(
    options.provider || process.env.UPLOAD_MODERATION_PROVIDER,
    "MANUAL",
  );
  const timeoutMs = options.timeoutMs ?? Number(process.env.MODERATION_TIMEOUT_MS || 45_000);

  if (
    process.env.MODERATION_ENABLED === "false" ||
    provider === "MANUAL" ||
    provider === "NONE"
  ) {
    return pending("MANUAL", "Aguardando revisao humana de conteudo.");
  }

  try {
    if (provider === "HTTP") {
      return await scanWithHttpProvider(
        buffer,
        filename,
        mimeType,
        "CONTENT_MODERATION_ENDPOINT",
        "CONTENT_MODERATION_TOKEN",
        "HTTP_MODERATION",
        timeoutMs,
      );
    }
    return pending(provider, `Fornecedor de moderacao nao suportado: ${provider}.`);
  } catch (cause) {
    return errorResult(
      provider,
      cause instanceof Error ? cause.message : "Falha desconhecida na moderacao.",
    );
  }
}

export function publicUploadSecurityReady() {
  const avProvider = normalizedProvider(process.env.UPLOAD_AV_PROVIDER, "CLAMAV");
  const moderationProvider = normalizedProvider(
    process.env.UPLOAD_MODERATION_PROVIDER,
    "MANUAL",
  );
  const avReady =
    (avProvider === "CLAMAV" && Boolean(process.env.CLAMAV_HOST)) ||
    (avProvider === "HTTP" && Boolean(process.env.AV_HTTP_ENDPOINT));
  const moderationReady =
    moderationProvider === "MANUAL" ||
    (moderationProvider === "HTTP" && Boolean(process.env.CONTENT_MODERATION_ENDPOINT));
  return avReady && moderationReady;
}

export async function moderateImage(): Promise<SecurityResult> {
  return pending("LEGACY", "Use moderateFileContent com o arquivo em quarentena.");
}
