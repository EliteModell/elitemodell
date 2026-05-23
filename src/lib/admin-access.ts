import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export type AdminRole =
  | "ADMIN_MASTER"
  | "ADMIN_GERAL"
  | "MODERADOR_CADASTROS"
  | "MODERADOR_CONTEUDO"
  | "SUPORTE"
  | "FINANCEIRO";

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
  | "settings:manage"
  | "staff:manage"
  | "audit:view";

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  ADMIN_MASTER: [
    "dashboard:view",
    "professionals:review",
    "hosts:review",
    "properties:review",
    "kyc:review",
    "clients:manage",
    "reports:manage",
    "support:manage",
    "finance:view",
    "settings:manage",
    "staff:manage",
    "audit:view",
  ],
  ADMIN_GERAL: [
    "dashboard:view",
    "professionals:review",
    "hosts:review",
    "properties:review",
    "kyc:review",
    "clients:manage",
    "reports:manage",
    "support:manage",
    "finance:view",
    "audit:view",
  ],
  MODERADOR_CADASTROS: [
    "dashboard:view",
    "professionals:review",
    "hosts:review",
    "properties:review",
    "kyc:review",
    "clients:manage",
    "audit:view",
  ],
  MODERADOR_CONTEUDO: ["dashboard:view", "reports:manage", "professionals:review", "properties:review", "audit:view"],
  SUPORTE: ["dashboard:view", "clients:manage", "reports:manage", "support:manage"],
  FINANCEIRO: ["dashboard:view", "finance:view", "audit:view"],
};

function adminMasterEmails() {
  return (process.env.ADMIN_MASTER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveAdminRole(email?: string | null): AdminRole {
  const masterEmails = adminMasterEmails();
  // Sem lista configurada, todos os ADMINs têm acesso ADMIN_MASTER
  if (masterEmails.length === 0) return "ADMIN_MASTER";
  if (email && masterEmails.includes(email.toLowerCase())) return "ADMIN_MASTER";
  return "ADMIN_GERAL";
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ADMIN_ROLE_PERMISSIONS[role].includes(permission);
}

export async function requireAdmin(permission?: AdminPermission) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(ACCOUNT_ROUTES.painelCliente);

  const adminRole = resolveAdminRole(session.user.email);
  if (permission && !hasAdminPermission(adminRole, permission)) {
    redirect("/admin/acesso-negado");
  }

  return { session, adminRole, permissions: ADMIN_ROLE_PERMISSIONS[adminRole] };
}
