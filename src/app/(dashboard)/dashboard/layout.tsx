import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES, shouldUseClientArea } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function ClientDashboardGuardLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAuthenticatedAccount();
  const shouldStayInClientArea = shouldUseClientArea(access);

  if (!access.isAdmin && !shouldStayInClientArea && access.hasCompanionRequest && !access.companionApproved) {
    if (!access.user.professional || access.companionStatus === "DRAFT") {
      redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
    }
    redirect(ACCOUNT_ROUTES.analiseAcompanhante);
  }

  return children;
}
