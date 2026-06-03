import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default function LegacyCompanionVerificationPage() {
  redirect(ACCOUNT_ROUTES.analiseAcompanhante);
}
