const PERSONA_API_BASE = "https://api.withpersona.com/api/v1";

export const PERSONA_FALLBACK_MESSAGE =
  "Biometria facial ainda nao configurada. Envie sua selfie ou video de verificacao abaixo para analise manual.";

type PersonaInquiryResponse = {
  data: {
    id: string;
    meta?: { "session-token"?: string };
  };
  meta?: {
    "session-token"?: string;
    "one-time-link"?: string;
    "one-time-link-short"?: string;
  };
};

export function getPersonaConfig() {
  const apiKey = process.env.PERSONA_API_KEY?.trim();
  const templateId =
    process.env.PERSONA_TEMPLATE_ID?.trim() ||
    process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim();
  const environment = process.env.PERSONA_ENVIRONMENT?.trim() || "sandbox";

  return {
    apiKey,
    templateId,
    environment,
    configured: Boolean(apiKey && templateId),
    missing: [
      !apiKey ? "PERSONA_API_KEY" : null,
      !templateId ? "PERSONA_TEMPLATE_ID ou PERSONA_INQUIRY_TEMPLATE_ID" : null,
    ].filter(Boolean) as string[],
  };
}

export async function createPersonaInquiry(userId: string, redirectUri: string) {
  const { apiKey, templateId } = getPersonaConfig();

  if (!apiKey || !templateId) {
    throw new Error("PERSONA_API_KEY ou PERSONA_TEMPLATE_ID nao configurados.");
  }

  const res = await fetch(`${PERSONA_API_BASE}/inquiries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Persona-Version": "2023-01-05",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": templateId,
          "reference-id": userId,
          "redirect-uri": redirectUri,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { errors?: { detail?: string }[] };
    throw new Error(err?.errors?.[0]?.detail ?? "Erro ao criar sessao no Persona.");
  }

  const json = await res.json() as PersonaInquiryResponse;
  return {
    inquiryId: json.data.id,
    sessionToken: json.meta?.["session-token"] ?? json.data.meta?.["session-token"],
    oneTimeLink: json.meta?.["one-time-link"] ?? json.meta?.["one-time-link-short"],
  };
}

export function buildPersonaUrl(inquiryId: string, sessionToken?: string) {
  const url = new URL("https://withpersona.com/verify");
  url.searchParams.set("inquiry-id", inquiryId);
  if (sessionToken) url.searchParams.set("session-token", sessionToken);
  return url.toString();
}

export async function verifyPersonaWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
  }

  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === v1;
}
