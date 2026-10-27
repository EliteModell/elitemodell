export const MAX_PROFILE_VIDEO_DURATION_SECONDS = 30;
export const MAX_PROFILE_VIDEO_BYTES = 50 * 1024 * 1024;

export const PROFILE_VIDEO_DURATION_ERROR =
  "Este vídeo ultrapassa o limite de 30 segundos. Escolha um vídeo mais curto para continuar.";

export const PROFILE_VIDEO_DURATION_UNKNOWN_ERROR =
  "Não foi possível confirmar a duração deste vídeo. Escolha um arquivo MP4, WebM ou MOV válido.";

export function profileVideoDurationError(durationSeconds: number | null) {
  if (durationSeconds === null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return PROFILE_VIDEO_DURATION_UNKNOWN_ERROR;
  }
  return durationSeconds > MAX_PROFILE_VIDEO_DURATION_SECONDS
    ? PROFILE_VIDEO_DURATION_ERROR
    : null;
}
