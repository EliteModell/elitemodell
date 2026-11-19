import { prisma } from "@/lib/prisma";
import { normalizeBrazilianPhone } from "@/lib/brazilian-phone";
import { registrationIdentity } from "@/lib/registration-monitor";

export const registrationStages = {
  PHONE_SEND: "Envio de código",
  PHONE_CHECK: "Validação de código",
  EMAIL_SEND: "Envio de e-mail",
  EMAIL_CONFIRMATION: "Confirmação de e-mail",
  ACCOUNT: "Criação da conta",
  DRAFT: "Rascunho",
  IDENTITY: "Identidade",
  PROFILE: "Envio do perfil",
} as const;

export function registrationReportFilters(params: Record<string, unknown>) {
  const hours = typeof params.hours === "string" && ["24", "48", "168", "720"].includes(params.hours) ? params.hours : "24";
  const type = typeof params.type === "string" && ["model", "client", "host"].includes(params.type) ? params.type : undefined;
  const stage = typeof params.stage === "string" && Object.hasOwn(registrationStages, params.stage) ? params.stage : undefined;
  const professional = typeof params.professional === "string" && /^[a-z0-9]{12,40}$/.test(params.professional) ? params.professional : undefined;
  const identity = typeof params.identity === "string" && /^[0-9a-f]{64}$/.test(params.identity) ? params.identity : undefined;
  return { hours, type, stage, professional, identity };
}

export async function professionalRegistrationIdentity(id: string) {
  const profile = await prisma.professional.findUnique({
    where: { id },
    select: { user: { select: { phone: true, phoneVerified: true, email: true } } },
  });
  const user = profile?.user;
  if (!user) return undefined;
  return user.phone && user.phoneVerified
    ? registrationIdentity("phone", normalizeBrazilianPhone(user.phone))
    : registrationIdentity("email", user.email);
}

export function registrationCsvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
