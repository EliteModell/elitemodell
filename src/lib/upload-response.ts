export type UploadApiPayload = {
  assetId?: string;
  path?: string | null;
  url?: string | null;
  status?: string;
  type?: string;
  thumbnail?: string | null;
  error?: string;
  message?: string;
};

export type AcceptedUpload = {
  assetId: string;
  reference: string;
  url: string | null;
  status: string;
  pending: boolean;
  type?: string;
  thumbnail?: string | null;
};

export function parseUploadResponse(response: Pick<Response, "ok" | "status">, payload: UploadApiPayload): AcceptedUpload {
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Não foi possível enviar o arquivo agora.");
  }
  const reference = payload.url || payload.path;
  if (!payload.assetId || !reference) {
    throw new Error("O upload foi aceito, mas a referência de acompanhamento não foi retornada.");
  }
  const status = payload.status || (response.status === 202 ? "QUARANTINED" : "APPROVED");
  return {
    assetId: payload.assetId,
    reference,
    url: payload.url || null,
    status,
    pending: response.status === 202 || status !== "APPROVED" || !payload.url,
    type: payload.type,
    thumbnail: payload.thumbnail,
  };
}

export const UPLOAD_PENDING_MESSAGE = "Arquivo recebido e mantido privado enquanto concluímos as verificações.";

export type UploadStatusPayload = {
  assetId: string;
  status: string;
  url: string | null;
  pending: boolean;
  displayState?: "PROCESSING" | "PUBLISHED" | "REVIEW_REQUIRED" | "REJECTED";
  failureReason?: string | null;
};

export async function monitorUpload(
  assetId: string,
  onSettled: (result: UploadStatusPayload) => unknown | Promise<unknown>,
  delaysMs = [5_000, 10_000, 20_000, 30_000, 60_000, 60_000],
) {
  for (const delayMs of delaysMs) {
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    const response = await fetch(`/api/uploads/${encodeURIComponent(assetId)}/status`, { cache: "no-store" });
    if (!response.ok) continue;
    const result = await response.json() as UploadStatusPayload;
    if (!result.pending) {
      await onSettled(result);
      return result;
    }
  }
  return null;
}
