import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(ACCOUNT_ROUTES.painelCliente);

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Usuários</h1>
      <p style={{ color: "#777" }}>
        Área administrativa reservada para gestão de usuários. A API de administração de usuários ainda não foi implementada.
      </p>
    </div>
  );
}
