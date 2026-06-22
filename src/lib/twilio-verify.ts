import {
  isValidBrazilianMobilePhone,
  normalizeBrazilianPhone,
} from "@/lib/phone-otp";

export const TWILIO_NOT_CONFIGURED_ERROR = "Twilio não configurado no servidor";

type TwilioVerifyPayload = {
  sid?: string;
  status?: string;
  code?: number;
  message?: string;
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

export class TwilioVerifyProviderError extends Error {
  readonly status: number;
  readonly providerCode?: number;

  constructor(message: string, status = 502, providerCode?: number) {
    super(message);
    this.name = "TwilioVerifyProviderError";
    this.status = status;
    this.providerCode = providerCode;
  }
}

export function twilioVerifyEnvironmentStatus() {
  return {
    hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
    hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    hasVerifyServiceSid: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim()),
  };
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
    throw new TwilioVerifyProviderError(
      safeProviderMessage(payload, "A Twilio recusou a solicitação de verificação."),
      response.status,
      payload.code,
    );
  }

  return payload;
}

export async function sendTwilioSmsVerification(phone: string) {
  const to = toBrazilianE164(phone);
  const payload = await twilioVerifyRequest(
    "Verifications",
    new URLSearchParams({
      To: to,
      Channel: "sms",
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

export async function checkTwilioSmsVerification(phone: string, code: string) {
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
