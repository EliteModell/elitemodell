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

  // Usuário sem consentimento/maioridade → completar cadastro obrigatório
  if (session.user.needsConsent) {
    redirect("/completar-cadastro");
  }

  // Proteção de rota: profissional aprovado não deve ver dashboard de cliente
  const userType = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountType: true,
      role: true,
      professional: { select: { status: true } },
      properties: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });

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
