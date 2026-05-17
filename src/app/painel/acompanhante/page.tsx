import { redirect } from "next/navigation";
import { requireCompanionPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function PainelAcompanhantePage() {
  await requireCompanionPanel();
  redirect(ACCOUNT_ROUTES.dashboardAcompanhante);
}
