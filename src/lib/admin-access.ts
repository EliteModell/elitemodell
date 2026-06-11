import "server-only";

import type { AdminRole as PrismaAdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { hasValidAdminMfaSession } from "@/lib/admin-mfa";

export type AdminRole = PrismaAdminRole;

export type AdminPermission =
  | "dashboard:view"
  | "professionals:review"
  | "hosts:review"
  | "properties:review"
  | "kyc:review"
  | "clients:manage"
  | "reports:manage"
  | "support:manage"
  | "finance:view"
  | "finance:adjust"
  | "vouchers:manage"
  | "settings:manage"
  | "staff:manage"
  | "audit:view"
  | "legal:manage"
  | "privacy:manage"
  | "incidents:manage";

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  ADMIN_MASTER: [
    "dashboard:view", "professionals:review", "hosts:review", "properties:review",
    "kyc:review", "clients:manage", "reports:manage", "support:manage",
    "finance:view", "finance:adjust", "vouchers:manage", "settings:manage",
    "staff:manage", "audit:view", "legal:manage", "privacy:manage",
    "incidents:manage",
  ],
  ADMIN_GERAL: [
    "dashboard:view", "professionals:review", "hosts:review", "properties:review",
    "kyc:review", "clients:manage", "reports:manage", "support:manage",
    "finance:view", "vouchers:manage", "audit:view", "privacy:manage",
  ],
  MODERADOR_CADASTROS: [
    "dashboard:view", "professionals:review", "hosts:review", "properties:review",
    "kyc:review", "clients:manage", "audit:view",
  ],
  MODERADOR_CONTEUDO: [
    "dashboard:view", "reports:manage", "professionals:review",
    "properties:review", "audit:view",
  ],
  SUPORTE: ["dashboard:view", "clients:manage", "reports:manage", "support:manage"],
  FINANCEIRO: ["dashboard:view", "finance:view", "finance:adjust", "vouchers:manage", "audit:view"],
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ADMIN_ROLE_PERMISSIONS[role].includes(permission);
}

export async function getAdminAccessForUser(userId: string) {
  const assignment = await prisma.adminRoleAssignment.findFirst({
    where: { userId, active: true, revokedAt: null },
    orderBy: [{ role: "asc" }, { grantedAt: "asc" }],
    select: { id: true, role: true },
  });

  if (!assignment) return null;
  return {
    assignmentId: assignment.id,
    adminRole: assignment.role,
    permissions: ADMIN_ROLE_PERMISSIONS[assignment.role],
  };
}

export async function requireAdminIdentity(permission?: AdminPermission) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(ACCOUNT_ROUTES.painelCliente);

  const access = await getAdminAccessForUser(session.user.id);
  if (!access) redirect(ACCOUNT_ROUTES.painelCliente);
  if (permission && !hasAdminPermission(access.adminRole, permission)) {
    redirect("/admin/acesso-negado");
  }

  return { session, ...access };
}

export async function requireAdmin(permission?: AdminPermission) {
  const access = await requireAdminIdentity(permission);
  if (!(await hasValidAdminMfaSession(access.session.user.id))) {
    redirect("/admin/mfa");
  }
  return access;
}

export async function authorizeAdminRequest(permission?: AdminPermission) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401, error: "Nao autenticado." };
  const access = await getAdminAccessForUser(session.user.id);
  if (!access) return { ok: false as const, status: 403, error: "Acesso administrativo negado." };
  if (permission && !hasAdminPermission(access.adminRole, permission)) {
    return { ok: false as const, status: 403, error: "Permissao administrativa insuficiente." };
  }
  if (!(await hasValidAdminMfaSession(session.user.id))) {
    return { ok: false as const, status: 428, error: "MFA administrativo obrigatorio." };
  }
  return { ok: true as const, session, ...access };
}
