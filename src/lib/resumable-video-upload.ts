"use client";

import * as tus from "tus-js-client";
import { loadSupabaseAuth } from "@/lib/supabase-auth-loader";
import { videoUploadErrorMessage } from "@/lib/public-error-message";

export type VideoUploadStage = "PREPARING" | "UPLOADING" | "PROCESSING" | "COMPLETE";

export function videoUploadStageLabel(stage: VideoUploadStage) {
  if (stage === "PREPARING") return "Preparando vídeo";
  if (stage === "UPLOADING") return "Enviando vídeo";
  if (stage === "PROCESSING") return "Processando com segurança";
  return "Envio concluído";
}

type UploadProgress = {
  stage: VideoUploadStage;
  percentage: number;
};

type UploadResult = {
  assetId: string;
  path: string;
  url: string | null;
  status: string;
  type: "video";
};

type UploadIntent = {
  assetId: string;
  bucket: string;
  objectName: string;
  endpoint: string;
};

async function jsonResponse(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export async function uploadProfileVideoResumable(options: {
  file: File;
  professionalId: string;
  contentRating?: string;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<UploadResult> {
  const { file, professionalId, contentRating = "STANDARD", onProgress } = options;
  onProgress?.({ stage: "PREPARING", percentage: 0 });

  const supabase = await loadSupabaseAuth();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente para enviar o vídeo.");

  const intentResponse = await fetch("/api/uploads/resumable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      professionalId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      contentRating,
      contentDeclarationAccepted: true,
    }),
  });
  const intentPayload = await jsonResponse(intentResponse);
  if (!intentResponse.ok) throw new Error(String(intentPayload.error || "Não foi possível preparar o envio do vídeo."));
  const intent = intentPayload as unknown as UploadIntent;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: intent.endpoint,
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000, 20_000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { authorization: `Bearer ${accessToken}`, "x-upsert": "false" },
      metadata: {
        bucketName: intent.bucket,
        objectName: intent.objectName,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        metadata: JSON.stringify({ assetId: intent.assetId, purpose: "professional-video" }),
      },
      onError: (cause) => reject(new Error(videoUploadErrorMessage(cause))),
      onProgress: (uploaded, total) => onProgress?.({
        stage: "UPLOADING",
        percentage: total > 0 ? Math.min(99, Math.round((uploaded / total) * 100)) : 0,
      }),
      onSuccess: () => resolve(),
    });
    void upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });

  onProgress?.({ stage: "PROCESSING", percentage: 100 });
  const finalizeResponse = await fetch("/api/uploads/resumable", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ assetId: intent.assetId }),
  });
  const finalized = await jsonResponse(finalizeResponse);
  if (!finalizeResponse.ok) throw new Error(String(finalized.error || "O vídeo foi enviado, mas o processamento não pôde ser concluído."));
  onProgress?.({ stage: "COMPLETE", percentage: 100 });
  return finalized as unknown as UploadResult;
}
