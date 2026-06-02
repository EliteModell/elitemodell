import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { authOptions } from "@/lib/auth";
import CompletarCadastroClient from "./CompletarCadastroClient";

export const dynamic = "force-dynamic";

export default async function CompletarCadastroPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`${ACCOUNT_ROUTES.login}?returnUrl=/completar-cadastro`);
  }

  return <CompletarCadastroClient />;
}
