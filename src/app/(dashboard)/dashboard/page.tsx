import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PremiumDashboardHome from "@/components/dashboard/PremiumDashboardHome";
import { authOptions } from "@/lib/auth";
import { getDashboardHomeData } from "@/lib/dashboard-data";
import { ACCOUNT_ROUTES, getHostRegistrationStatus, hostPathForStatus, shouldUseClientArea } from "@/lib/account-routes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ACCOUNT_ROUTES.login);
  }

  // Proteção de rota: profissional aprovado não deve ver dashboard de cliente
  // Inclui verificação de consentimento direto do banco (evita loop por JWT em cache)
  const userType = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountType: true,
      role: true,
      lgpdConsent: true,
      termsConsent: true,
      birthDate: true,
      clientProfile: { select: { id: true } },
      professional: { select: { status: true } },
      properties: { select: { status: true } },
    },
  });

  if (!userType?.lgpdConsent || !userType?.termsConsent || !userType?.birthDate) {
    redirect("/completar-cadastro");
  }

  if (userType) {
    if (shouldUseClientArea({ activeProfileType: session.user.activeProfileType, clientProfile: userType.clientProfile })) {
      const data = await getDashboardHomeData(session.user.id);
      if (!data) redirect(ACCOUNT_ROUTES.login);
      return <PremiumDashboardHome data={data} clientStatus={session.user.clientStatus} />;
    }

    const isApprovedProfessional = userType.professional?.status === "ACTIVE" || userType.professional?.status === "PAUSED";
    const hostStatus = getHostRegistrationStatus(userType);
    const isModel = userType.accountType === "model";

    if (isApprovedProfessional || isModel) {
      redirect(ACCOUNT_ROUTES.dashboardAcompanhante);
    }
    if (hostStatus !== "NO_REQUEST") {
      redirect(hostPathForStatus(hostStatus));
    }
  }

  const data = await getDashboardHomeData(session.user.id);

  if (!data) {
    redirect(ACCOUNT_ROUTES.login);
  }

  return <PremiumDashboardHome data={data} clientStatus={session.user.clientStatus} />;
}
