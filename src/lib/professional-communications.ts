import "server-only";

import { prisma } from "@/lib/prisma";

function validEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.toLowerCase().endsWith("@sms.elitemodell.local"));
}

function normalizedBrazilPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11 ? `+55${national}` : null;
}

export async function deliverProfessionalApprovalSms(input: {
  professionalId: string;
  userId: string;
  adminId?: string;
}) {
  const [user, previous] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        phone: true,
        consentPreferences: {
          where: { purpose: "MARKETING" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { granted: true, revokedAt: true },
        },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        targetType: "PROFESSIONAL",
        targetId: input.professionalId,
        reason: "professional:approval-sms",
      },
      select: { id: true },
    }),
  ]);
  if (previous) return { smsStatus: "SMS_ALREADY_SENT" as const };
  const consent = user?.consentPreferences[0];
  const phone = normalizedBrazilPhone(user?.phone);
  if (!phone || !consent?.granted || consent.revokedAt) return { smsStatus: "SMS_SKIPPED" as const };
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) return { smsStatus: "SMS_NOT_CONFIGURED" as const };

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: phone,
      From: from,
      Body: "Elite Modell: Seu cadastro foi aprovado! Você já pode acessar sua conta e aproveitar a plataforma. Obrigado pela confiança! www.elitemodell.com.br",
    }),
  });
  await prisma.auditLog.create({ data: {
    adminId: input.adminId,
    actorIdentifier: input.adminId ?? "SYSTEM",
    action: "SETTINGS_CHANGED",
    targetType: "PROFESSIONAL",
    targetId: input.professionalId,
    changes: { communicationStatus: response.ok ? "SMS_SENT" : "SMS_FAILED", communicationType: "PROFILE_APPROVED" },
    reason: "professional:approval-sms",
  } });
  return { smsStatus: response.ok ? "SMS_SENT" as const : "SMS_FAILED" as const };
}

export async function deliverProfessionalCommunication(input: {
  professionalId: string;
  userId: string;
  email: string | null | undefined;
  adminId?: string;
  type: string;
  notificationTitle: string;
  notificationBody: string;
  link?: string;
  send: () => Promise<void>;
}) {
  await prisma.notification.create({ data: {
    userId: input.userId,
    type: input.type,
    title: input.notificationTitle,
    body: input.notificationBody,
    link: input.link ?? "/profissional/notificacoes",
  } });
  if (!validEmail(input.email)) {
    await prisma.auditLog.create({ data: {
      adminId: input.adminId,
      actorIdentifier: input.adminId ?? "SYSTEM",
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: input.professionalId,
      changes: { communicationStatus: "EMAIL_FAILED", communicationType: input.type },
      reason: "E-mail ausente ou inválido",
    } });
    return { emailStatus: "EMAIL_FAILED" as const };
  }
  try {
    await input.send();
    await prisma.auditLog.create({ data: {
      adminId: input.adminId,
      actorIdentifier: input.adminId ?? "SYSTEM",
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: input.professionalId,
      changes: { communicationStatus: "EMAIL_SENT", communicationType: input.type },
      reason: "Mensagem aceita pelo provedor de e-mail",
    } });
    return { emailStatus: "EMAIL_SENT" as const };
  } catch (error) {
    await prisma.auditLog.create({ data: {
      adminId: input.adminId,
      actorIdentifier: input.adminId ?? "SYSTEM",
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: input.professionalId,
      changes: { communicationStatus: "EMAIL_FAILED", communicationType: input.type },
      reason: error instanceof Error ? error.name : "Falha do provedor",
    } });
    return { emailStatus: "EMAIL_FAILED" as const };
  }
}
