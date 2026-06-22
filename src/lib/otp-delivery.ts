import "server-only";

import type { OtpDeliveryChannel, PhoneAccountType } from "@/lib/phone-otp";

type OtpDeliveryInput = {
  phone: string;
  code: string;
  channel: OtpDeliveryChannel;
  accountType: PhoneAccountType;
};

type OtpDeliveryResult = {
  provider: string;
  providerMessageId?: string;
};

type WhatsAppCloudTemplateParameter = {
  type: "text";
  text: string;
};

type WhatsAppCloudTemplateComponent = {
  type: "body" | "button";
  sub_type?: "url" | "quick_reply" | "copy_code";
  index?: string;
  parameters?: WhatsAppCloudTemplateParameter[];
};

export class OtpDeliveryConfigurationError extends Error {
  constructor(message = "Provedor de envio de codigo nao configurado.") {
    super(message);
    this.name = "OtpDeliveryConfigurationError";
  }
}

export class OtpDeliveryProviderError extends Error {
  constructor(message = "Nao foi possivel enviar o codigo.") {
    super(message);
    this.name = "OtpDeliveryProviderError";
  }
}

interface OtpDeliveryProvider {
  send(input: OtpDeliveryInput): Promise<OtpDeliveryResult>;
}

function twilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

function twilioTo(phone: string, channel: OtpDeliveryChannel) {
  const e164 = `+55${phone}`;
  return channel === "whatsapp" ? `whatsapp:${e164}` : e164;
}

function twilioFrom(fromNumber: string, channel: OtpDeliveryChannel) {
  if (channel !== "whatsapp") return fromNumber;
  return fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
}

function otpMessage(code: string) {
  return `Elite Modell: seu codigo de verificacao e ${code}. Ele expira em 5 minutos.`;
}

function hasTwilioCredentials() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_FROM_NUMBER)
  );
}

function hasWhatsAppCloudCredentials() {
  return Boolean(
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN &&
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_CLOUD_TEMPLATE_NAME
  );
}

function isLocalOtpLogAllowed() {
  return process.env.OTP_DEV_LOG_CODE === "true" && process.env.NODE_ENV !== "production";
}

function envFlag(name: string, defaultValue = false) {
  const value = process.env[name];
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function graphVersion() {
  const configured = process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || "v20.0";
  return configured.startsWith("v") ? configured : `v${configured}`;
}

function interpolateTemplateValue(value: unknown, input: OtpDeliveryInput): unknown {
  if (typeof value === "string") {
    return value
      .replace(/\{\{\s*code\s*\}\}/g, input.code)
      .replace(/\{\{\s*phone\s*\}\}/g, `55${input.phone}`)
      .replace(/\{\{\s*message\s*\}\}/g, otpMessage(input.code));
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateTemplateValue(item, input));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateTemplateValue(item, input)])
    );
  }

  return value;
}

function whatsAppCloudTemplateComponents(input: OtpDeliveryInput): WhatsAppCloudTemplateComponent[] {
  const configuredComponents = process.env.WHATSAPP_CLOUD_TEMPLATE_COMPONENTS;
  if (configuredComponents) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configuredComponents) as unknown;
    } catch {
      throw new OtpDeliveryConfigurationError("WHATSAPP_CLOUD_TEMPLATE_COMPONENTS precisa ser um JSON valido.");
    }
    if (!Array.isArray(parsed)) {
      throw new OtpDeliveryConfigurationError("WHATSAPP_CLOUD_TEMPLATE_COMPONENTS deve ser um array JSON.");
    }
    return interpolateTemplateValue(parsed, input) as WhatsAppCloudTemplateComponent[];
  }

  const components: WhatsAppCloudTemplateComponent[] = [
    {
      type: "body",
      parameters: [{ type: "text", text: input.code }],
    },
  ];

  if (envFlag("WHATSAPP_CLOUD_TEMPLATE_BUTTON_CODE")) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: input.code }],
    });
  }

  return components;
}

class TwilioOtpDeliveryProvider implements OtpDeliveryProvider {
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID;
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN;
  private readonly verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  private readonly fromNumber = process.env.TWILIO_FROM_NUMBER;

  private assertCredentials() {
    if (!this.accountSid || !this.authToken) {
      throw new OtpDeliveryConfigurationError("Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.");
    }
  }

  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    this.assertCredentials();

    if (this.verifyServiceSid) {
      return this.sendViaVerify(input);
    }

    if (this.fromNumber) {
      return this.sendViaMessaging(input);
    }

    throw new OtpDeliveryConfigurationError(
      "Configure TWILIO_VERIFY_SERVICE_SID ou TWILIO_FROM_NUMBER para enviar codigos."
    );
  }

  private async sendViaVerify(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    const accountSid = this.accountSid as string;
    const authToken = this.authToken as string;
    const serviceSid = this.verifyServiceSid as string;
    const body = new URLSearchParams({
      To: twilioTo(input.phone, input.channel),
      Channel: input.channel,
      CustomCode: input.code,
      Locale: "pt-BR",
    });

    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: twilioAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!response.ok) {
      throw new OtpDeliveryProviderError(payload.message ?? "Twilio Verify recusou o envio do codigo.");
    }

    return { provider: "twilio-verify", providerMessageId: payload.sid };
  }

  private async sendViaMessaging(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    const accountSid = this.accountSid as string;
    const authToken = this.authToken as string;
    const from = twilioFrom(this.fromNumber as string, input.channel);
    const body = new URLSearchParams({
      To: twilioTo(input.phone, input.channel),
      From: from,
      Body: otpMessage(input.code),
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: twilioAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!response.ok) {
      throw new OtpDeliveryProviderError(payload.message ?? "Twilio Messaging recusou o envio do codigo.");
    }

    return { provider: "twilio-messaging", providerMessageId: payload.sid };
  }
}

class WhatsAppCloudOtpDeliveryProvider implements OtpDeliveryProvider {
  private readonly accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  private readonly templateName = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME;
  private readonly templateLanguage = process.env.WHATSAPP_CLOUD_TEMPLATE_LANGUAGE || "pt_BR";

  private assertCredentials() {
    if (!this.accessToken || !this.phoneNumberId || !this.templateName) {
      throw new OtpDeliveryConfigurationError(
        "Configure WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID e WHATSAPP_CLOUD_TEMPLATE_NAME."
      );
    }
  }

  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    if (input.channel !== "whatsapp") {
      throw new OtpDeliveryConfigurationError(
        "O provider whatsapp-cloud envia apenas WhatsApp. Configure Twilio para SMS."
      );
    }

    this.assertCredentials();

    const response = await fetch(
      `https://graph.facebook.com/${graphVersion()}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: `55${input.phone}`,
          type: "template",
          template: {
            name: this.templateName,
            language: { code: this.templateLanguage },
            components: whatsAppCloudTemplateComponents(input),
          },
        }),
      }
    );
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new OtpDeliveryProviderError(
        payload.error?.message ?? "WhatsApp Cloud API recusou o envio do codigo."
      );
    }

    return { provider: "whatsapp-cloud", providerMessageId: payload.messages?.[0]?.id };
  }
}

function hasZenviaCredentials() {
  return Boolean(process.env.ZENVIA_API_TOKEN);
}

class ZenviaOtpDeliveryProvider implements OtpDeliveryProvider {
  private readonly apiToken = process.env.ZENVIA_API_TOKEN;
  private readonly senderId = process.env.ZENVIA_SENDER_ID || "EliteModell";

  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    if (!this.apiToken) {
      throw new OtpDeliveryConfigurationError("Configure ZENVIA_API_TOKEN.");
    }

    const to = `+55${input.phone}`;
    const response = await fetch("https://api.zenvia.com/v2/channels/sms/messages", {
      method: "POST",
      headers: {
        "X-API-TOKEN": this.apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.senderId,
        to,
        contents: [{ type: "text", text: otpMessage(input.code) }],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string; details?: string };

    if (!response.ok) {
      throw new OtpDeliveryProviderError(
        payload.message ?? payload.details ?? "Zenvia recusou o envio do codigo."
      );
    }

    return { provider: "zenvia", providerMessageId: payload.id };
  }
}

class DevelopmentLogOtpDeliveryProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    console.info(`[otp:development] ${input.accountType}/${input.channel} ${input.phone}: ${input.code}`);
    return { provider: "development-log" };
  }
}

class AutoOtpDeliveryProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    if (input.channel === "whatsapp" && hasWhatsAppCloudCredentials()) {
      return new WhatsAppCloudOtpDeliveryProvider().send(input);
    }

    if (hasZenviaCredentials()) {
      return new ZenviaOtpDeliveryProvider().send(input);
    }

    if (hasTwilioCredentials()) {
      return new TwilioOtpDeliveryProvider().send(input);
    }

    if (isLocalOtpLogAllowed()) {
      return new DevelopmentLogOtpDeliveryProvider().send(input);
    }

    if (input.channel === "whatsapp") {
      throw new OtpDeliveryConfigurationError(
        "Envio por WhatsApp nao configurado. Configure WhatsApp Cloud API ou Twilio."
      );
    }

    throw new OtpDeliveryConfigurationError("Envio de SMS nao configurado. Configure Zenvia ou Twilio.");
  }
}

export function getOtpDeliveryProvider(): OtpDeliveryProvider {
  const provider = (process.env.PHONE_OTP_PROVIDER ?? "auto").toLowerCase();

  if (provider === "auto") {
    return new AutoOtpDeliveryProvider();
  }

  if (provider === "twilio") {
    if (
      !process.env.TWILIO_ACCOUNT_SID &&
      !process.env.TWILIO_AUTH_TOKEN &&
      isLocalOtpLogAllowed()
    ) {
      return new DevelopmentLogOtpDeliveryProvider();
    }
    return new TwilioOtpDeliveryProvider();
  }

  if (provider === "whatsapp-cloud" || provider === "meta-whatsapp") {
    return new WhatsAppCloudOtpDeliveryProvider();
  }

  if (provider === "development-log") {
    if (!isLocalOtpLogAllowed()) {
      throw new OtpDeliveryConfigurationError("development-log so pode ser usado fora de producao.");
    }
    return new DevelopmentLogOtpDeliveryProvider();
  }

  if (provider === "zenvia") {
    return new ZenviaOtpDeliveryProvider();
  }

  if (provider === "infobip") {
    throw new OtpDeliveryConfigurationError(
      `Provider infobip ainda nao esta implementado.`
    );
  }

  throw new OtpDeliveryConfigurationError(`Provider OTP invalido: ${provider}.`);
}
