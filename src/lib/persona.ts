const PERSONA_API_BASE = "https://api.withpersona.com/api/v1";
const PERSONA_HOSTED_FLOW_BASE = "https://inquiry.withpersona.com/verify";

// ─── Types for inquiry details + check evaluation ────────────────────────────

export type PersonaCheck = {
  name: string;
  status: "passed" | "failed" | "not_applicable";
  reasons?: string[];
};

export type PersonaVerification = {
  id: string;
  type: string;
  attributes: {
    status:
      | "passed"
      | "failed"
      | "requires_retry"
      | "initiated"
      | "submitted"
      | "confirmed"
      | "invalidated"
      | "not_applicable"
      | "canceled"
      | "created";
    checks?: PersonaCheck[];
    birthdate?: string | null;
    "expiration-date"?: string | null;
    "country-code"?: string | null;
  };
};

export type PersonaInquiryDetails = {
  data: {
    id: string;
    type: "inquiry";
    attributes: {
      status: string;
      "reference-id"?: string | null;
      "is-sandbox": boolean;
      "created-at"?: string | null;
      "completed-at"?: string | null;
      "approved-at"?: string | null;
      "declined-at"?: string | null;
      "failed-at"?: string | null;
      "reviewer-comment"?: string | null;
      "decline-reason-code"?: string | null;
    };
    relationships?: {
      verifications?: { data: Array<{ id: string; type: string }> };
    };
  };
  included?: PersonaVerification[];
};

export type PersonaKycDecision = {
  decision: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
  isSandbox: boolean;
  reason: string;
  checksJson: Record<string, unknown>;
};

export const PERSONA_FALLBACK_MESSAGE =
  "Verificacao manual pendente. Envie sua selfie ou video de verificacao abaixo para analise manual.";

export const PERSONA_PENDING_STATUS = "PERSONA_PENDING";
export const MANUAL_PENDING_STATUS = "KYC_MANUAL_PENDENTE";

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

type PersonaErrorCode =
  | "PERSONA_ENV_MISSING"
  | "PERSONA_TEMPLATE_INVALID"
  | "PERSONA_API_UNAUTHORIZED"
  | "PERSONA_API_FORBIDDEN"
  | "PERSONA_API_TEMPLATE_INVALID"
  | "PERSONA_API_ERROR"
  | "PERSONA_NETWORK_ERROR";

export class PersonaIntegrationError extends Error {
  code: PersonaErrorCode;
  status?: number;
  details?: unknown;

  constructor(message: string, code: PersonaErrorCode, status?: number, details?: unknown) {
    super(message);
    this.name = "PersonaIntegrationError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getPersonaConfig() {
  const apiKey = process.env.PERSONA_API_KEY?.trim();
  const templateId =
    process.env.PERSONA_TEMPLATE_ID?.trim() ||
    process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim();
  const environment = process.env.PERSONA_ENVIRONMENT?.trim() || "sandbox";
  const publicEnvironment = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT?.trim();
  const apiVersion = process.env.PERSONA_API_VERSION?.trim() || "2025-12-08";

  return {
    apiKey,
    templateId,
    environment,
    publicEnvironment,
    apiVersion,
    configured: Boolean(apiKey && templateId),
    missing: [
      !apiKey ? "PERSONA_API_KEY" : null,
      !templateId ? "PERSONA_TEMPLATE_ID ou PERSONA_INQUIRY_TEMPLATE_ID" : null,
    ].filter(Boolean) as string[],
  };
}

export function shouldUsePersonaProvider() {
  const config = getPersonaConfig();
  if (!config.configured) return false;
  if (process.env.NODE_ENV === "production" && process.env.KYC_PROVIDER?.trim().toUpperCase() !== "PERSONA") {
    return false;
  }
  if (process.env.NODE_ENV === "production" && !process.env.PERSONA_WEBHOOK_SECRET?.trim()) {
    return false;
  }
  return true;
}

export function getPersonaAvailability() {
  const config = getPersonaConfig();
  const templateInvalid = Boolean(config.templateId && !config.templateId.startsWith("itmpl_"));
  const providerEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.KYC_PROVIDER?.trim().toUpperCase() === "PERSONA";
  const webhookConfigured = Boolean(process.env.PERSONA_WEBHOOK_SECRET?.trim());

  return {
    configured: config.configured && !templateInvalid && providerEnabled && (process.env.NODE_ENV !== "production" || webhookConfigured),
    environment: config.environment,
    publicEnvironment: config.publicEnvironment,
    missing: [
      ...config.missing,
      !providerEnabled ? "KYC_PROVIDER=PERSONA" : null,
      process.env.NODE_ENV === "production" && !webhookConfigured ? "PERSONA_WEBHOOK_SECRET" : null,
    ].filter(Boolean) as string[],
    templateInvalid,
    webhookConfigured,
  };
}

export function personaProviderLabel(provider?: string | null, sessionId?: string | null) {
  if (provider?.toUpperCase() === "PERSONA" || sessionId?.startsWith("inq_")) return "PERSONA";
  return "MANUAL";
}

export async function createPersonaInquiry(userId: string, redirectUri: string) {
  const { apiKey, templateId, apiVersion } = getPersonaConfig();

  if (!apiKey || !templateId) {
    throw new PersonaIntegrationError(
      "PERSONA_API_KEY ou PERSONA_TEMPLATE_ID nao configurados.",
      "PERSONA_ENV_MISSING",
    );
  }

  if (!templateId.startsWith("itmpl_")) {
    throw new PersonaIntegrationError(
      "PERSONA_TEMPLATE_ID deve ser um Inquiry Template da Persona e comecar com itmpl_.",
      "PERSONA_TEMPLATE_INVALID",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${PERSONA_API_BASE}/inquiries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Persona-Version": apiVersion,
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
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new PersonaIntegrationError(
      "Erro de rede ao chamar a API da Persona.",
      "PERSONA_NETWORK_ERROR",
      undefined,
      err instanceof Error ? { name: err.name, message: err.message } : String(err),
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let details: unknown = text;
    try {
      details = text ? JSON.parse(text) : {};
    } catch {}

    const err = details as { errors?: { detail?: string; title?: string; code?: string }[] };
    const detail = err?.errors?.[0]?.detail ?? err?.errors?.[0]?.title;
    const code =
      res.status === 401 ? "PERSONA_API_UNAUTHORIZED"
      : res.status === 403 ? "PERSONA_API_FORBIDDEN"
      : detail?.toLowerCase().includes("template") ? "PERSONA_API_TEMPLATE_INVALID"
      : "PERSONA_API_ERROR";

    throw new PersonaIntegrationError(
      detail ?? `Persona respondeu HTTP ${res.status}.`,
      code,
      res.status,
      details,
    );
  }

  const json = await res.json() as PersonaInquiryResponse;
  return {
    inquiryId: json.data.id,
    sessionToken: json.meta?.["session-token"] ?? json.data.meta?.["session-token"],
    oneTimeLink: json.meta?.["one-time-link"] ?? json.meta?.["one-time-link-short"],
  };
}

export function buildPersonaUrl(inquiryId: string, sessionToken?: string, redirectUri?: string) {
  const url = new URL(PERSONA_HOSTED_FLOW_BASE);
  url.searchParams.set("inquiry-id", inquiryId);
  if (sessionToken) url.searchParams.set("session-token", sessionToken);
  if (redirectUri) url.searchParams.set("redirect-uri", redirectUri);
  return url.toString();
}

export async function verifyPersonaWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const signatureSets = signatureHeader.trim().split(/\s+/).filter(Boolean);
  const parsedSets = signatureSets.map((set) => {
    const parts: Record<string, string> = {};
    for (const part of set.split(",")) {
      const idx = part.indexOf("=");
      if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
    return parts;
  });

  const timestamp = parsedSets.find((parts) => parts.t)?.t;
  if (!timestamp) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return parsedSets.some((parts) => Boolean(parts.v1) && timingSafeEqualHex(expected, parts.v1));
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Fetch full inquiry details (includes verifications + checks) ─────────────

export async function fetchPersonaInquiryDetails(
  inquiryId: string,
): Promise<PersonaInquiryDetails> {
  const { apiKey, apiVersion } = getPersonaConfig();
  if (!apiKey) {
    throw new PersonaIntegrationError(
      "PERSONA_API_KEY ausente ao buscar detalhes da inquiry.",
      "PERSONA_ENV_MISSING",
    );
  }

  let res: Response;
  try {
    res = await fetch(
      `${PERSONA_API_BASE}/inquiries/${encodeURIComponent(inquiryId)}?include=verifications`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Persona-Version": apiVersion,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (err) {
    throw new PersonaIntegrationError(
      "Erro de rede ao buscar detalhes da inquiry.",
      "PERSONA_NETWORK_ERROR",
      undefined,
      err instanceof Error ? { name: err.name, message: err.message } : String(err),
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PersonaIntegrationError(
      `Persona respondeu HTTP ${res.status} ao buscar detalhes da inquiry.`,
      "PERSONA_API_ERROR",
      res.status,
      text,
    );
  }

  return res.json() as Promise<PersonaInquiryDetails>;
}

// ─── Checks críticos de fraude que causam REJECTED imediato ──────────────────

const CRITICAL_FRAUD_CHECKS = new Set([
  "selfie_liveness_check",
  "id_tamper_check",
  "id_repeat_detection_check",
  "selfie_suspicious_entity_check",
  "id_blocklist_check",
  "database_repeat_count_check",
]);

// ─── Avalia checks individuais da inquiry e retorna decisão ──────────────────
//
// Regras (em ordem de prioridade):
// 1. is-sandbox === true → NEEDS_REVIEW (nunca aprovação automática)
// 2. government-id ausente ou não "passed" → NEEDS_REVIEW / REJECTED
// 3. selfie ausente ou não "passed" → NEEDS_REVIEW / REJECTED
// 4. Check crítico de fraude falhou → REJECTED
// 5. Documento expirado → REJECTED
// 6. Inconsistência de idade → REJECTED
// 7. liveness falhou → REJECTED
// 8. Idade < 18 conforme documento → REJECTED
// 9. Todos os checks obrigatórios passaram → VERIFIED

export function evaluatePersonaInquiry(details: PersonaInquiryDetails): PersonaKycDecision {
  const attrs = details.data.attributes;
  const isSandbox = attrs["is-sandbox"] === true;

  const checksJson: Record<string, unknown> = {
    isSandbox,
    inquiryId: details.data.id,
    inquiryStatus: attrs.status,
    verifications: {} as Record<string, unknown>,
  };

  // Regra 1: Nunca aprovar dados simulados
  if (isSandbox) {
    return {
      decision: "NEEDS_REVIEW",
      isSandbox: true,
      reason:
        "[SANDBOX] Dado simulado detectado. Aprovação automática bloqueada. Requer revisão manual.",
      checksJson,
    };
  }

  // Indexa verifications por tipo
  const verByType: Record<string, PersonaVerification> = {};
  for (const v of details.included ?? []) {
    if (v.type?.startsWith("verification/")) {
      verByType[v.type] = v;
    }
  }

  const verChecks = checksJson.verifications as Record<string, unknown>;

  // Regra 2: Government ID obrigatório e deve estar "passed"
  const govId = verByType["verification/government-id"];
  if (!govId) {
    return {
      decision: "NEEDS_REVIEW",
      isSandbox: false,
      reason: "Verificação de documento de identidade não encontrada na inquiry.",
      checksJson: { ...checksJson, missingGovernmentId: true },
    };
  }

  verChecks["government-id"] = {
    status: govId.attributes.status,
    checks: govId.attributes.checks ?? [],
  };

  if (govId.attributes.status !== "passed") {
    return {
      decision: govId.attributes.status === "failed" ? "REJECTED" : "NEEDS_REVIEW",
      isSandbox: false,
      reason: `Documento de identidade não aprovado (status: ${govId.attributes.status}).`,
      checksJson,
    };
  }

  // Verifica checks individuais do government-id
  for (const check of govId.attributes.checks ?? []) {
    if (check.status === "failed") {
      if (check.name === "id_expired_check") {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: "Documento de identidade expirado.",
          checksJson,
        };
      }
      if (check.name === "id_age_inconsistency_check") {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: "Inconsistência de idade no documento. Possível menor de idade.",
          checksJson,
        };
      }
      if (CRITICAL_FRAUD_CHECKS.has(check.name)) {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: `Sinal crítico de fraude no documento: ${check.name}.`,
          checksJson,
        };
      }
    }
  }

  // Regra 3: Selfie obrigatória e deve estar "passed"
  const selfie = verByType["verification/selfie"];
  if (!selfie) {
    return {
      decision: "NEEDS_REVIEW",
      isSandbox: false,
      reason: "Verificação de selfie não encontrada na inquiry.",
      checksJson: { ...checksJson, missingSelfie: true },
    };
  }

  verChecks["selfie"] = {
    status: selfie.attributes.status,
    checks: selfie.attributes.checks ?? [],
  };

  if (selfie.attributes.status !== "passed") {
    return {
      decision: selfie.attributes.status === "failed" ? "REJECTED" : "NEEDS_REVIEW",
      isSandbox: false,
      reason: `Selfie não aprovada (status: ${selfie.attributes.status}).`,
      checksJson,
    };
  }

  // Verifica checks críticos da selfie
  for (const check of selfie.attributes.checks ?? []) {
    if (check.status === "failed") {
      if (check.name === "selfie_liveness_check") {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: "Liveness da selfie falhou. Possível foto de foto ou deepfake.",
          checksJson,
        };
      }
      if (CRITICAL_FRAUD_CHECKS.has(check.name)) {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: `Sinal crítico de fraude na selfie: ${check.name}.`,
          checksJson,
        };
      }
    }
  }

  // Regra 8: Idade mínima 18 anos conforme documento
  const birthdate = govId.attributes.birthdate;
  if (birthdate) {
    try {
      const birth = new Date(birthdate);
      const today = new Date();
      let age = today.getUTCFullYear() - birth.getUTCFullYear();
      const m = today.getUTCMonth() - birth.getUTCMonth();
      if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
      checksJson.ageFromDocument = age;
      if (age < 18) {
        return {
          decision: "REJECTED",
          isSandbox: false,
          reason: `Usuário é menor de idade (${age} anos conforme documento).`,
          checksJson,
        };
      }
    } catch {
      checksJson.birthdateParseError = birthdate;
    }
  } else {
    checksJson.birthdateMissing = true;
  }

  // Todos os checks obrigatórios passaram
  return {
    decision: "VERIFIED",
    isSandbox: false,
    reason:
      "Todos os checks obrigatórios aprovados: documento válido, selfie aprovada, face match e maioridade confirmados.",
    checksJson,
  };
}
