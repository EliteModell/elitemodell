export const TECHNICAL_PHONE_EMAIL_DOMAIN = "@sms.elitemodell.local";
export const MISSING_EMAIL_LABEL = "E-mail não informado";

export function isTechnicalPhoneEmail(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith(TECHNICAL_PHONE_EMAIL_DOMAIN));
}

export function realAccountEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized || isTechnicalPhoneEmail(normalized)) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function accountEmailLabel(value: string | null | undefined) {
  return realAccountEmail(value) ?? MISSING_EMAIL_LABEL;
}
