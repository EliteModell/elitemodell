import { redirect } from "next/navigation";
import { requireClientPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function PainelClientePage() {
  await requireClientPanel();
  redirect(ACCOUNT_ROUTES.dashboardCliente);
}
