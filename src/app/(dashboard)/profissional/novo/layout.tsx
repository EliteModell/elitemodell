import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default async function ProfessionalOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAuthenticatedAccount();

  if (access.companionApproved) redirect(ACCOUNT_ROUTES.dashboardAcompanhante);
  if (access.user.professional && access.companionStatus !== "DRAFT") {
    redirect(ACCOUNT_ROUTES.analiseAcompanhante);
  }
  if (access.isAdmin || access.hasCompanionRequest) return children;

  redirect(`${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`);
}
