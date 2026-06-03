import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function ClientDashboardGuardLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAuthenticatedAccount();

  if (!access.isAdmin && access.hasCompanionRequest && !access.companionApproved) {
    if (!access.user.professional || access.companionStatus === "DRAFT") {
      redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
    }
    redirect(ACCOUNT_ROUTES.analiseAcompanhante);
  }

  return children;
}
