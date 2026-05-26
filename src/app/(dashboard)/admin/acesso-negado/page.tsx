import Link from "next/link";
import { AdminHeader, AdminPanel, buttonStyle } from "../_components/AdminPrimitives";

export default function AdminAcessoNegadoPage() {
  return (
    <div>
      <AdminHeader title="Acesso negado" subtitle="Seu usuário é administrador, mas não possui permissão para esta área operacional." />
      <AdminPanel>
        <p style={{ color: "#94a3b8", margin: "0 0 16px" }}>
          Para liberar funções críticas como funcionários e configurações sensíveis, configure `ADMIN_MASTER_EMAILS` no ambiente com o e-mail do administrador principal.
        </p>
        <Link href="/admin" style={{ ...buttonStyle, textDecoration: "none" }}>Voltar ao dashboard</Link>
      </AdminPanel>
    </div>
  );
}
