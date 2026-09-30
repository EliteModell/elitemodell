import "server-only";

import { prisma } from "@/lib/prisma";

function validEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
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
