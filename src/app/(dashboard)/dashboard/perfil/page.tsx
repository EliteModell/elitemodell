import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PremiumProfile from "@/components/dashboard/PremiumProfile";
import { authOptions } from "@/lib/auth";
import { getPremiumProfileData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PerfilClientePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getPremiumProfileData(session.user.id);

  if (!data) {
    redirect("/login");
  }

  return <PremiumProfile data={data} />;
}
