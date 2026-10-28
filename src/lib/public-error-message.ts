const PORTUGUESE_HINT = /[áàâãéêíóôõúç]|\b(não|erro|falha|arquivo|vídeo|foto|cadastro|sessão|tente|possível|enviar|inválid[oa])\b/i;

const TECHNICAL_ERROR = /(?:expected pattern|failed to fetch|networkerror|load failed|aborterror|syntaxerror|typeerror|unexpected token|json|fetch|stack|supabase|vercel|status code|http\s*\d{3})/i;

export function publicErrorMessage(
  cause: unknown,
  fallback = "Não foi possível concluir esta operação. Tente novamente.",
) {
  const message = cause instanceof Error
    ? cause.message
    : typeof cause === "string"
      ? cause
      : "";
  const normalized = message.trim();
  if (!normalized || TECHNICAL_ERROR.test(normalized) || !PORTUGUESE_HINT.test(normalized)) return fallback;
  return normalized.slice(0, 240);
}

export function videoUploadErrorMessage(cause: unknown) {
  return publicErrorMessage(
    cause,
    "Não foi possível enviar seu vídeo. Verifique sua conexão e tente novamente. Seu cadastro foi preservado.",
  );
}
