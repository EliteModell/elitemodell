import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default async function AdminReservasPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(ACCOUNT_ROUTES.painelCliente);

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Reservas</h1>
      <p style={{ color: "#777" }}>
        Monitoramento administrativo de reservas e pagamentos será ligado a endpoints com permissão de ADMIN.
      </p>
    </div>
  );
}
