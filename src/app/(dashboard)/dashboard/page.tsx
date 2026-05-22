import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PremiumDashboardHome from "@/components/dashboard/PremiumDashboardHome";
import { authOptions } from "@/lib/auth";
import { getDashboardHomeData } from "@/lib/dashboard-data";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ACCOUNT_ROUTES.login);
  }

  let data;
  try {
    data = await getDashboardHomeData(session.user.id);
  } catch (err) {
    console.error("[dashboard] getDashboardHomeData failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  if (!data) {
    redirect(ACCOUNT_ROUTES.login);
  }

  return <PremiumDashboardHome data={data} clientStatus={session.user.clientStatus} />;
}
