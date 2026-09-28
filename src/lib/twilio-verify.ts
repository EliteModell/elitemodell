import {
  isValidBrazilianMobilePhone,
  normalizeBrazilianPhone,
} from "@/lib/phone-otp";

export const TWILIO_NOT_CONFIGURED_ERROR = "Twilio não configurado no servidor";
export const TWILIO_WHATSAPP_NOT_CONFIGURED_ERROR =
  "O envio pelo WhatsApp ainda não está disponível. Você pode receber o código por SMS.";

export type TwilioVerifyChannel = "sms" | "whatsapp";

type TwilioVerifyPayload = {
  sid?: string;
  status?: string;
  code?: number;
  message?: string;
};

type TwilioVerifyServicePayload = {
  whatsapp?: {
    msg_service_sid?: string | null;
    from?: string | null;
  } | null;
};

type TwilioWhatsAppSendersPayload = {
  senders?: Array<{
    sid?: string;
    sender_id?: string;
    status?: string;
  }>;
};

type TwilioChannelSendersPayload = {
  channel_senders?: Array<{
    sid?: string;
    sender?: string;
    messaging_service_sid?: string;
  }>;
};

export type TwilioWhatsAppAvailability = {
  available: boolean;
  verifyMessagingServiceMatches: boolean;
  senderOnline: boolean;
  senderInMessagingService: boolean;
  reason:
    | "available"
    | "disabled"
    | "missing-configuration"
    | "provider-unavailable"
    | "verify-service-mismatch"
    | "sender-offline"
    | "sender-not-associated";
};

type TwilioVerifyConfig = {
  accountSid: string;
  authToken: string;
  serviceSid: string;
};

export class TwilioVerifyConfigurationError extends Error {
  constructor() {
    super(TWILIO_NOT_CONFIGURED_ERROR);
    this.name = "TwilioVerifyConfigurationError";
  }
}

export class TwilioWhatsAppVerifyConfigurationError extends Error {
  constructor() {
    super(TWILIO_WHATSAPP_NOT_CONFIGURED_ERROR);
    this.name = "TwilioWhatsAppVerifyConfigurationError";
  }
}

export class TwilioVerifyProviderError extends Error {
  readonly status: number;
  readonly providerCode?: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status = 502, providerCode?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "TwilioVerifyProviderError";
    this.status = status;
    this.providerCode = providerCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function twilioVerifyEnvironmentStatus() {
  return {
    hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
    hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    hasVerifyServiceSid: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim()),
    hasMessagingServiceSid: Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()),
    whatsAppVerifyEnabled: isTwilioWhatsAppVerifyEnabled(),
  };
}

export function isTwilioWhatsAppVerifyEnabled() {
  return process.env.TWILIO_WHATSAPP_VERIFY_ENABLED?.trim().toLowerCase() === "true";
}

function getTwilioVerifyConfig(): TwilioVerifyConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  if (!accountSid || !authToken || !serviceSid) {
    throw new TwilioVerifyConfigurationError();
  }

  return { accountSid, authToken, serviceSid };
}

export function assertTwilioVerifyConfigured() {
  getTwilioVerifyConfig();
}

export function toBrazilianE164(value: string) {
  const phone = normalizeBrazilianPhone(value);
  if (!isValidBrazilianMobilePhone(phone)) {
    throw new Error("Informe um celular brasileiro válido.");
  }
  return `+55${phone}`;
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `+${digits.slice(0, 2)}*******${digits.slice(-4)}`;
}

function authorizationHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function readTwilioPayload(response: Response): Promise<TwilioVerifyPayload> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as TwilioVerifyPayload;
  } catch {
    return {};
  }
}

function safeProviderMessage(payload: TwilioVerifyPayload, fallback: string) {
  const message = payload.message?.replace(/\+\d{8,15}/g, "[telefone mascarado]").trim();
  return message || fallback;
}

async function twilioVerifyRequest(path: string, body: URLSearchParams) {
  const config = getTwilioVerifyConfig();
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.serviceSid}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(config.accountSid, config.authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );
  const payload = await readTwilioPayload(response);

  if (!response.ok) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new TwilioVerifyProviderError(
      safeProviderMessage(payload, "A Twilio recusou a solicitação de verificação."),
      response.status,
      payload.code,
      Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined,
    );
  }

  return payload;
}

export async function sendTwilioVerification(
  phone: string,
  channel: TwilioVerifyChannel,
) {
  if (channel === "whatsapp" && !isTwilioWhatsAppVerifyEnabled()) {
    throw new TwilioWhatsAppVerifyConfigurationError();
  }

  const to = toBrazilianE164(phone);
  const payload = await twilioVerifyRequest(
    "Verifications",
    new URLSearchParams({
      To: to,
      Channel: channel,
      Locale: "pt-BR",
      // Contingência para bloqueios 60238 do Fraud Guard. A API mantém
      // limites próprios por IP e telefone antes de chegar à Twilio.
      RiskCheck: "disable",
    }),
  );

  return {
    sid: payload.sid,
    status: payload.status ?? "pending",
    to,
  };
}

async function twilioReadJson<T>(url: string, config: TwilioVerifyConfig): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: authorizationHeader(config.accountSid, config.authToken) },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new TwilioVerifyProviderError(
      "Não foi possível confirmar a configuração do WhatsApp na Twilio.",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export async function getTwilioWhatsAppAvailability(): Promise<TwilioWhatsAppAvailability> {
  if (!isTwilioWhatsAppVerifyEnabled()) {
    return {
      available: false,
      verifyMessagingServiceMatches: false,
      senderOnline: false,
      senderInMessagingService: false,
      reason: "disabled",
    };
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const whatsAppSender = process.env.TWILIO_WHATSAPP_SENDER?.trim();
  const environment = twilioVerifyEnvironmentStatus();
  if (
    !messagingServiceSid ||
    !whatsAppSender ||
    !environment.hasAccountSid ||
    !environment.hasAuthToken ||
    !environment.hasVerifyServiceSid
  ) {
    return {
      available: false,
      verifyMessagingServiceMatches: false,
      senderOnline: false,
      senderInMessagingService: false,
      reason: "missing-configuration",
    };
  }

  const config = getTwilioVerifyConfig();

  try {
    const [verifyService, senders, channelSenders] = await Promise.all([
      twilioReadJson<TwilioVerifyServicePayload>(
        `https://verify.twilio.com/v2/Services/${config.serviceSid}`,
        config,
      ),
      twilioReadJson<TwilioWhatsAppSendersPayload>(
        "https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp",
        config,
      ),
      twilioReadJson<TwilioChannelSendersPayload>(
        `https://messaging.twilio.com/v1/Services/${messagingServiceSid}/ChannelSenders`,
        config,
      ),
    ]);

    const verifyMessagingServiceMatches =
      verifyService.whatsapp?.msg_service_sid === messagingServiceSid;
    const senderOnline = Boolean(
      senders.senders?.some(
        (sender) => sender.sender_id === whatsAppSender && sender.status === "ONLINE",
      ),
    );
    const senderInMessagingService = Boolean(
      channelSenders.channel_senders?.some(
        (sender) =>
          sender.sender === whatsAppSender &&
          sender.messaging_service_sid === messagingServiceSid,
      ),
    );

    const available =
      verifyMessagingServiceMatches && senderOnline && senderInMessagingService;
    const reason: TwilioWhatsAppAvailability["reason"] = available
      ? "available"
      : !verifyMessagingServiceMatches
        ? "verify-service-mismatch"
        : !senderOnline
          ? "sender-offline"
          : "sender-not-associated";

    return {
      available,
      verifyMessagingServiceMatches,
      senderOnline,
      senderInMessagingService,
      reason,
    };
  } catch (error) {
    console.warn("[twilio-verify] whatsapp_availability_check_failed", {
      status: error instanceof TwilioVerifyProviderError ? error.status : undefined,
      providerCode: error instanceof TwilioVerifyProviderError ? error.providerCode : undefined,
    });
    return {
      available: false,
      verifyMessagingServiceMatches: false,
      senderOnline: false,
      senderInMessagingService: false,
      reason: "provider-unavailable",
    };
  }
}

export function sendTwilioSmsVerification(phone: string) {
  return sendTwilioVerification(phone, "sms");
}

export async function checkTwilioVerification(phone: string, code: string) {
  const to = toBrazilianE164(phone);
  const payload = await twilioVerifyRequest(
    "VerificationCheck",
    new URLSearchParams({ To: to, Code: code }),
  );

  return {
    approved: payload.status === "approved",
    sid: payload.sid,
    status: payload.status ?? "unknown",
    to,
  };
}

export function checkTwilioSmsVerification(phone: string, code: string) {
  return checkTwilioVerification(phone, code);
}
