import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PremiumDashboardHome from "@/components/dashboard/PremiumDashboardHome";
import { authOptions } from "@/lib/auth";
import { getDashboardHomeData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getDashboardHomeData(session.user.id);

  if (!data) {
    redirect("/login");
  }

  return <PremiumDashboardHome data={data} />;
}
