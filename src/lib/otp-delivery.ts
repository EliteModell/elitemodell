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

function otpMessage(code: string) {
  return `Elite Modell: seu codigo de verificacao e ${code}. Ele expira em 5 minutos.`;
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
    const from = input.channel === "whatsapp" ? `whatsapp:${this.fromNumber}` : this.fromNumber as string;
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

class DevelopmentLogOtpDeliveryProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    console.info(`[otp:development] ${input.accountType}/${input.channel} ${input.phone}: ${input.code}`);
    return { provider: "development-log" };
  }
}

export function getOtpDeliveryProvider(): OtpDeliveryProvider {
  const provider = (process.env.PHONE_OTP_PROVIDER ?? "twilio").toLowerCase();

  if (provider === "twilio") {
    if (
      !process.env.TWILIO_ACCOUNT_SID &&
      !process.env.TWILIO_AUTH_TOKEN &&
      process.env.OTP_DEV_LOG_CODE === "true" &&
      process.env.NODE_ENV !== "production"
    ) {
      return new DevelopmentLogOtpDeliveryProvider();
    }
    return new TwilioOtpDeliveryProvider();
  }

  if (["whatsapp-cloud", "zenvia", "infobip"].includes(provider)) {
    throw new OtpDeliveryConfigurationError(
      `Provider ${provider} ainda nao esta implementado. Use a interface OtpDeliveryProvider para plugar o adaptador.`
    );
  }

  throw new OtpDeliveryConfigurationError(`Provider OTP invalido: ${provider}.`);
}
