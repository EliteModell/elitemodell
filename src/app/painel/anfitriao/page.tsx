import { redirect } from "next/navigation";
import { requireHostPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function PainelAnfitriaoPage() {
  await requireHostPanel();
  redirect(ACCOUNT_ROUTES.dashboardAnfitriao);
}
