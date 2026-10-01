import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_ROUTES,
  getHostRegistrationStatus,
  hostPathForStatus,
  isHostAccountType,
  isProfessionalCategory,
  postLoginPathFromUser,
} from "@/lib/account-routes";
import { getProfessionalBillingSettings, resolveProfessionalAccess } from "@/lib/professional-access";

export async function getCurrentAccountAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [user, billingSettings] = await Promise.all([prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      accountType: true,
      category: true,
      premiumUntil: true,
      clientProfile: { select: { id: true } },
      hostProfile: { select: { id: true } },
      professional: {
        select: {
          id: true,
          status: true,
          kycStatus: true,
          rejectReason: true,
          accessGrandfathered: true,
          freeAccessStartedAt: true,
          freeAccessEndsAt: true,
          billingStatus: true,
          subscriptionStartedAt: true,
          subscriptionEndsAt: true,
        },
      },
      properties: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  }), getProfessionalBillingSettings()]);

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const isCompanionIntent = user.accountType === "model" || isProfessionalCategory(user.category);
  const companionStatus = user.professional?.status ?? null;
  const hostStatus = getHostRegistrationStatus(user);
  const activeProfileType = session.user.activeProfileType ?? null;
  const hasClientProfile = Boolean(user.clientProfile);
  const professionalAccess = user.professional
    ? resolveProfessionalAccess(
        user.professional,
        user,
        companionStatus === "ACTIVE" || companionStatus === "PAUSED",
        new Date(),
        billingSettings,
      )
    : null;

  return {
    user,
    activeProfileType,
    hasClientProfile,
    isAdmin,
    isCompanionIntent,
    companionStatus,
    hasCompanionRequest: Boolean(user.professional || isCompanionIntent),
    companionApproved: companionStatus === "ACTIVE" || companionStatus === "PAUSED",
    companionInReview: Boolean(companionStatus && companionStatus !== "ACTIVE" && companionStatus !== "PAUSED"),
    professionalAccess,
    billingSettings,
    hostStatus,
    hasHostRequest: Boolean(user.hostProfile) || user.properties.length > 0,
    hasHostIntent: (Boolean(user.hostProfile) || isHostAccountType(user.accountType)) && !isCompanionIntent,
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

export async function requireCompanionPanel(options: { allowExpired?: boolean } = {}) {
  const access = await requireAuthenticatedAccount();
  if (access.isAdmin) return access;
  if (!access.companionApproved) {
    if (!access.user.professional) redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
    if (access.hasCompanionRequest) redirect(ACCOUNT_ROUTES.verificacaoAcompanhante);
    redirect(ACCOUNT_ROUTES.cadastroAcompanhante);
  }
  if (access.professionalAccess && !access.professionalAccess.canUsePlatform && !options.allowExpired) {
    redirect("/profissional/planos?acesso=expirado");
  }
  return access;
}

export async function requireHostPanel() {
  const access = await requireAuthenticatedAccount();
  if (access.isAdmin) return access;
  if (access.hasHostRequest || access.hasHostIntent) return access;
  if (access.hasCompanionRequest) redirect(access.postLoginPath);
  redirect(hostPathForStatus(access.hostStatus));
  return access;
}
