import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ClientAreaShell from "@/components/client-area/ClientAreaShell";
import NotificationsEmptyState from "@/components/client-area/NotificationsEmptyState";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(ACCOUNT_ROUTES.login);

  return (
    <ClientAreaShell backHref="/dashboard/acompanhantes">
      <NotificationsEmptyState />
    </ClientAreaShell>
  );
}
