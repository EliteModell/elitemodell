import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_CREATED"
  | "USER_VERIFIED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "PROFESSIONAL_APPROVED"
  | "PROFESSIONAL_REJECTED"
  | "PROPERTY_APPROVED"
  | "PROPERTY_REJECTED"
  | "CONTENT_FLAGGED"
  | "ADMIN_ACCESS"
  | "SETTINGS_CHANGED"
  | "PAYMENT_PROCESSED"
  | "PAYMENT_REFUNDED";

export interface AuditLog {
  id: string;
  adminId: string;
  action: AuditAction;
  targetType: "USER" | "PROFESSIONAL" | "PROPERTY" | "CONTENT" | "PAYMENT" | "SYSTEM";
  targetId: string;
  changes?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Registra uma ação de auditoria
 */
export async function logAudit({
  adminId,
  action,
  targetType,
  targetId,
  changes,
  reason,
  ipAddress,
  userAgent,
}: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        actorIdentifier: adminId,
        action,
        targetType,
        targetId,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
        reason,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[AUDIT ERROR]", error);
    // Não lance erro para não quebrar a operação principal
  }
}

/**
 * Obtém histórico de auditoria de um recurso
 */
export async function getAuditHistory(targetId: string, targetType: string) {
  try {
    return await prisma.auditLog.findMany({
      where: { targetId, targetType: targetType as "USER" | "PROFESSIONAL" | "PROPERTY" | "CONTENT" | "PAYMENT" | "SYSTEM" },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
  } catch (error) {
    console.error("[GET AUDIT ERROR]", error);
    return [];
  }
}

/**
 * Registra acesso de admin
 */
export async function logAdminAccess(
  adminId: string,
  section: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    adminId,
    action: "ADMIN_ACCESS",
    targetType: "SYSTEM",
    targetId: section,
    ipAddress,
  });
}

/**
 * Registra bloqueio de usuário
 */
export async function logUserBlocked(
  adminId: string,
  userId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    adminId,
    action: "USER_BLOCKED",
    targetType: "USER",
    targetId: userId,
    reason,
    ipAddress,
  });
}

/**
 * Registra aprovação de profissional
 */
export async function logProfessionalApproved(
  adminId: string,
  professionalId: string,
  reason?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    adminId,
    action: "PROFESSIONAL_APPROVED",
    targetType: "PROFESSIONAL",
    targetId: professionalId,
    reason,
    ipAddress,
  });
}

/**
 * Registra rejeição de profissional
 */
export async function logProfessionalRejected(
  adminId: string,
  professionalId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    adminId,
    action: "PROFESSIONAL_REJECTED",
    targetType: "PROFESSIONAL",
    targetId: professionalId,
    reason,
    ipAddress,
  });
}
