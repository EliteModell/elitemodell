import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { redirect } from "next/navigation";
import ClientAreaShell from "@/components/client-area/ClientAreaShell";
import NotificationsEmptyState from "@/components/client-area/NotificationsEmptyState";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { requireAuthenticatedAccount } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const access = await requireAuthenticatedAccount();
  if (!access.isAdmin && access.hasCompanionRequest && !access.companionApproved) {
    if (!access.user.professional || access.companionStatus === "DRAFT") {
      redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
    }
    redirect(ACCOUNT_ROUTES.analiseAcompanhante);
  }

  return (
    <ClientAreaShell backHref="/dashboard/acompanhantes">
      <NotificationsEmptyState />
    </ClientAreaShell>
  );
}
