import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default function CadastroAnfitriaoPage() {
  redirect(ACCOUNT_ROUTES.onboardingAnfitriao);
}
