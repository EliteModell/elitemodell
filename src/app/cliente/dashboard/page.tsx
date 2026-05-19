import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default function ClienteDashboardAliasPage() {
  redirect(ACCOUNT_ROUTES.mainClientFeed);
}
