import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PremiumDashboardHome from "@/components/dashboard/PremiumDashboardHome";
import { authOptions } from "@/lib/auth";
import { getDashboardHomeData } from "@/lib/dashboard-data";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
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
      professional: { select: { status: true } },
      properties: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });

  if (!userType?.lgpdConsent || !userType?.termsConsent || !userType?.birthDate) {
    redirect("/completar-cadastro");
  }

  if (userType) {
    const isApprovedProfessional = userType.professional?.status === "ACTIVE";
    const isApprovedHost = userType.properties.length > 0;
    const isModel = userType.accountType === "model";
    const isHost = userType.accountType === "host";

    if (isApprovedProfessional && isModel) {
      redirect(ACCOUNT_ROUTES.dashboardAcompanhante);
    }
    if (isApprovedHost && isHost) {
      redirect(ACCOUNT_ROUTES.dashboardAnfitriao);
    }
  }

  const data = await getDashboardHomeData(session.user.id);

  if (!data) {
    redirect(ACCOUNT_ROUTES.login);
  }

  return <PremiumDashboardHome data={data} clientStatus={session.user.clientStatus} />;
}
