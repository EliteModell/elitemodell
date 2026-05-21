import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_ROUTES, isProfessionalCategory, postLoginPathFromUser } from "@/lib/account-routes";

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
  const submittedHostProperties = user.properties.filter((property) => property.status !== "DRAFT");
  const hostStatuses = submittedHostProperties.map((property) => property.status);

  return {
    user,
    isAdmin,
    isCompanionIntent,
    companionStatus,
    hasCompanionRequest: Boolean(user.professional || isCompanionIntent),
    companionApproved: companionStatus === "ACTIVE",
    companionInReview: Boolean(companionStatus && companionStatus !== "ACTIVE"),
    hasHostRequest: submittedHostProperties.length > 0,
    hasHostIntent: (user.role === "HOST" || user.accountType === "host") && !isCompanionIntent,
    hostApproved: hostStatuses.includes("ACTIVE"),
    hostInReview: hostStatuses.some((status) => status !== "ACTIVE"),
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
    if (access.hasCompanionRequest) redirect(ACCOUNT_ROUTES.verificacaoAcompanhante);
    redirect(ACCOUNT_ROUTES.cadastroAcompanhante);
  }
  return access;
}

export async function requireHostPanel() {
  const access = await requireAuthenticatedAccount();
  if (access.isAdmin) return access;
  if (!access.hostApproved) {
    if (access.hasHostRequest) redirect(ACCOUNT_ROUTES.verificacaoAnfitriao);
    redirect(ACCOUNT_ROUTES.onboardingAnfitriao);
  }
  return access;
}
