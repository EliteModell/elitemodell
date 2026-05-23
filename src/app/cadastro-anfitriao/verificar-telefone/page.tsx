import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default function VerificarTelefoneAnfitriaoPage() {
  redirect(ACCOUNT_ROUTES.onboardingAnfitriao);
}
