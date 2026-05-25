import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_ROUTES,
  getHostRegistrationStatus,
  hostPathForStatus,
  isProfessionalCategory,
  postLoginPathFromUser,
} from "@/lib/account-routes";

export async function getCurrentAccountAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      accountType: true,
      category: true,
      professional: { select: { id: true, status: true, rejectReason: true } },
      properties: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const isCompanionIntent = user.accountType === "model" || isProfessionalCategory(user.category);
  const companionStatus = user.professional?.status ?? null;
  const hostStatus = getHostRegistrationStatus(user);

  return {
    user,
    isAdmin,
    isCompanionIntent,
    companionStatus,
    hasCompanionRequest: Boolean(user.professional || isCompanionIntent),
    companionApproved: companionStatus === "ACTIVE" || companionStatus === "PAUSED",
    companionInReview: Boolean(companionStatus && companionStatus !== "ACTIVE" && companionStatus !== "PAUSED"),
    hostStatus,
    hasHostRequest: user.properties.length > 0,
    hasHostIntent: (user.role === "HOST" || user.accountType === "host") && !isCompanionIntent,
    hostApproved: hostStatus === "APROVADO",
    hostInReview: hostStatus === "PENDENTE_APROVACAO",
    hostRejected: hostStatus === "REPROVADO",
    hostIncomplete: hostStatus === "CADASTRO_INCOMPLETO",
    postLoginPath: postLoginPathFromUser(user),
  };
}

export async function requireAuthenticatedAccount() {
  const access = await getCurrentAccountAccess();
  if (!access) redirect(ACCOUNT_ROUTES.login);
  return access;
}

export async function requireClientPanel() {
  return requireAuthenticatedAccount();
}

export async function requireCompanionPanel() {
  const access = await requireAuthenticatedAccount();
  if (access.isAdmin) return access;
  if (!access.companionApproved) {
    if (!access.user.professional) redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
    if (access.hasCompanionRequest) redirect(ACCOUNT_ROUTES.verificacaoAcompanhante);
    redirect(ACCOUNT_ROUTES.cadastroAcompanhante);
  }
  return access;
}

export async function requireHostPanel() {
  const access = await requireAuthenticatedAccount();
  if (access.isAdmin) return access;
  if (!access.hostApproved) {
    redirect(hostPathForStatus(access.hostStatus));
  }
  return access;
}
