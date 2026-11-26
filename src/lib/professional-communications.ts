import "server-only";

import { prisma } from "@/lib/prisma";
import { realAccountEmail } from "@/lib/account-email";
import { sendProfessionalPublishedEmail } from "@/lib/auth-email";
import { recoverTrackedEmail } from "@/lib/email-delivery-recovery";
import { professionalApprovalEmailIdempotencyKey, professionalPublicationEmailIdempotencyKey } from "@/lib/email-idempotency";

function normalizedBrazilPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11 ? `+55${national}` : null;
}

export async function deliverProfessionalApprovalSms(input: {
  professionalId: string;
  userId: string;
  adminId?: string;
  dedupeReason?: string;
  body?: string;
}) {
  const dedupeReason = input.dedupeReason ?? "professional:approval-sms";
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
        reason: dedupeReason,
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
      Body: input.body ?? "Elite Modell: Seu cadastro foi aprovado! Você já pode acessar sua conta e aproveitar a plataforma. Obrigado pela confiança! www.elitemodell.com.br",
    }),
  });
  await prisma.auditLog.create({ data: {
    adminId: input.adminId,
    actorIdentifier: input.adminId ?? "SYSTEM",
    action: "SETTINGS_CHANGED",
    targetType: "PROFESSIONAL",
    targetId: input.professionalId,
    changes: { communicationStatus: response.ok ? "SMS_SENT" : "SMS_FAILED", communicationType: "PROFILE_APPROVED" },
    reason: dedupeReason,
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
  dedupeReason?: string;
  send: () => Promise<void>;
}) {
  if (input.dedupeReason) {
    const delivered = await prisma.auditLog.findFirst({
      where: { targetType: "PROFESSIONAL", targetId: input.professionalId, reason: input.dedupeReason },
      select: { id: true },
    });
    if (delivered) return { emailStatus: "EMAIL_ALREADY_SENT" as const };
  }
  const notificationLink = input.link ?? "/profissional/notificacoes";
  const existingNotification = input.dedupeReason ? await prisma.notification.findFirst({
    where: { userId: input.userId, type: input.type, link: notificationLink },
    select: { id: true },
  }) : null;
  if (!existingNotification) {
    await prisma.notification.create({ data: {
      userId: input.userId,
      type: input.type,
      title: input.notificationTitle,
      body: input.notificationBody,
      link: notificationLink,
    } });
  }
  if (!realAccountEmail(input.email)) {
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
      reason: input.dedupeReason ?? "Mensagem aceita pelo provedor de e-mail",
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

function profileApprovalEmailKeys(professionalId: string) {
  return [professionalPublicationEmailIdempotencyKey(professionalId), professionalApprovalEmailIdempotencyKey(professionalId)];
}

export async function deliverProfileApprovalCommunication(input: {
  professionalId: string;
  userId: string;
  email: string | null | undefined;
  adminId?: string;
}) {
  const profile = await prisma.professional.findFirst({
    where: { id: input.professionalId, userId: input.userId, status: "ACTIVE", verified: true },
    select: { displayName: true },
  });
  if (!profile) return;
  const previous = await prisma.emailDelivery.findFirst({
    where: { idempotencyKey: { in: profileApprovalEmailKeys(input.professionalId) } },
    select: { id: true },
  });
  if (previous) return;
  await deliverProfessionalCommunication({
    ...input,
    type: "PROFILE_PUBLISHED",
    notificationTitle: "Seu perfil foi aprovado!",
    notificationBody: "Seu perfil está disponível conforme suas configurações de visibilidade.",
    link: "/profissional",
    dedupeReason: "professional:profile-published-email:v1",
    send: () => sendProfessionalPublishedEmail(input.email!, input.professionalId, undefined, profile.displayName),
  });
}

export async function recoverProfileApprovalEmail(professionalId: string) {
  const profile = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { status: true, verified: true, displayName: true, user: { select: { blocked: true, email: true, emailVerified: true } } },
  });
  const email = profile?.user.emailVerified && !profile.user.blocked ? realAccountEmail(profile.user.email) : null;
  if (profile?.status !== "ACTIVE" || !profile.verified || !email) return "unavailable";
  const [canonical, legacy] = profileApprovalEmailKeys(professionalId);
  const deliveries = await prisma.emailDelivery.findMany({
    where: { idempotencyKey: { in: [canonical, legacy] } },
    select: { idempotencyKey: true, status: true },
  });
  if (deliveries.some((delivery) => delivery.status === "DELIVERED")) return "delivered";
  // If old and new records coexist, a retry could duplicate a prior delivery.
  if (deliveries.length !== 1 || !deliveries[0].idempotencyKey) return "unconfirmed";
  return recoverTrackedEmail({
    key: deliveries[0].idempotencyKey,
    retryKey: canonical,
    professionalId,
    email,
    send: (id) => sendProfessionalPublishedEmail(email, professionalId, id, profile.displayName),
  });
}
