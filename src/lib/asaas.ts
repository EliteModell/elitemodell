type AsaasEnvironment = "sandbox" | "production";

const DEFAULT_API_URLS: Record<AsaasEnvironment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

export type AsaasCustomer = {
  id: string;
};

export type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  value?: number;
  netValue?: number;
  refundedValue?: number;
  billingType?: string;
  dueDate?: string;
  paymentDate?: string | null;
  confirmedDate?: string | null;
};

export type AsaasPixQrCode = {
  encodedImage?: string | null;
  payload?: string | null;
  expirationDate?: string | null;
};

export class AsaasApiError extends Error {
  status: number;
  path: string;
  details: unknown;

  constructor(message: string, input: { status: number; path: string; details: unknown }) {
    super(message);
    this.name = "AsaasApiError";
    this.status = input.status;
    this.path = input.path;
    this.details = input.details;
  }
}

function cleanEnv(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === `"` && last === `"`) || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).trim() || undefined;
  }

  return trimmed;
}

function getAsaasEnvironment(): AsaasEnvironment {
  const value = cleanEnv(process.env.ASAAS_ENVIRONMENT) || cleanEnv(process.env.ASAAS_ENV);
  return value?.toLowerCase() === "production" ? "production" : "sandbox";
}

export function getAsaasConfig() {
  const environment = getAsaasEnvironment();
  const apiKey = cleanEnv(process.env.ASAAS_API_KEY);
  const baseUrl =
    cleanEnv(process.env.ASAAS_API_URL) ||
    cleanEnv(process.env.ASAAS_BASE_URL) ||
    DEFAULT_API_URLS[environment];
  const productionReady =
    process.env.NODE_ENV !== "production" ||
    environment === "production" ||
    cleanEnv(process.env.ALLOW_ASAAS_SANDBOX_IN_PRODUCTION) === "true";

  return {
    apiKey,
    baseUrl,
    environment,
    configured: Boolean(apiKey),
    productionReady,
  };
}

async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getAsaasConfig();

  if (!config.apiKey) {
    throw new Error("ASAAS_API_KEY não configurada.");
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: config.apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      Array.isArray(payload?.errors) && payload.errors[0]?.description
        ? payload.errors[0].description
        : "Erro ao comunicar com o Asaas.";
    throw new AsaasApiError(message, {
      status: response.status,
      path,
      details: payload,
    });
  }

  return payload as T;
}

export async function createAsaasCustomer(input: {
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
}) {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email || undefined,
      cpfCnpj: input.cpfCnpj?.replace(/\D/g, "") || undefined,
      mobilePhone: input.phone?.replace(/\D/g, "") || undefined,
    }),
  });
}

export async function createAsaasPixPayment(input: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}) {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "PIX",
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function getAsaasPixQrCode(paymentId: string) {
  return asaasRequest<AsaasPixQrCode>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
    method: "GET",
  });
}

export async function getAsaasPayment(paymentId: string) {
  return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export async function cancelAsaasPayment(paymentId: string) {
  return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "DELETE",
  });
}

export async function refundAsaasPayment(paymentId: string, input?: { value?: number; description?: string }) {
  return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      value: input?.value,
      description: input?.description,
    }),
  });
}

export function isAsaasPaidStatus(status?: string | null) {
  return status === "RECEIVED" || status === "CONFIRMED";
}

export function isAsaasFailedStatus(status?: string | null) {
  return status === "REFUNDED" || status === "OVERDUE" || status === "DELETED";
}

export function sanitizeAsaasPayment(payment: AsaasPayment) {
  return {
    id: payment.id,
    status: payment.status ?? null,
    value: payment.value ?? null,
    netValue: payment.netValue ?? null,
    refundedValue: payment.refundedValue ?? null,
    billingType: payment.billingType ?? null,
    externalReference: payment.externalReference ?? null,
    dueDate: payment.dueDate ?? null,
    paymentDate: payment.paymentDate ?? null,
    confirmedDate: payment.confirmedDate ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
  };
}

export type AsaasCardPaymentResult = {
  id: string;
  status?: string;
  creditCardToken?: string | null;
  creditCardNumber?: string | null;
  creditCardBrand?: string | null;
  invoiceUrl?: string | null;
  value?: number;
};

export type AsaasCardInput = {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string | null;
  };
  remoteIp: string;
};

export async function createAsaasCardPayment(input: AsaasCardInput) {
  return asaasRequest<AsaasCardPaymentResult>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "CREDIT_CARD",
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    }),
  });
}
