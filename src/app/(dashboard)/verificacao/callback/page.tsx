import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

// Persona redirects here after the user completes or abandons the flow.
// The real decision arrives by webhook; this page only returns to the correct account flow.
export default async function VerificacaoCallbackPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (user?.activeProfileType === "CLIENTE") {
    redirect("/dashboard/verificacao-idade");
  }

  if (
    user?.activeProfileType === "PROFESSIONAL" ||
    (!user?.activeProfileType &&
      (user?.accountType === "model" ||
        user?.accountType === "professional" ||
        user?.isProfessional))
  ) {
    redirect(ACCOUNT_ROUTES.analiseAcompanhante);
  }

  redirect("/dashboard/verificacao-idade");
}
