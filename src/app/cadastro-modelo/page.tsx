import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default function ModelRegisterPage() {
  redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
}
