import Link from "next/link";
import { AdminHeader, AdminPanel, buttonStyle } from "../_components/AdminPrimitives";

export default function AdminAcessoNegadoPage() {
  return (
    <div>
      <AdminHeader title="Acesso negado" subtitle="Seu usuario e administrador, mas nao possui permissao para esta area operacional." />
      <AdminPanel>
        <p style={{ color: "#94a3b8", margin: "0 0 16px" }}>
          Para liberar funcoes criticas como funcionarios e configuracoes sensiveis, configure `ADMIN_MASTER_EMAILS` no ambiente com o email do administrador principal.
        </p>
        <Link href="/admin" style={{ ...buttonStyle, textDecoration: "none" }}>Voltar ao dashboard</Link>
      </AdminPanel>
    </div>
  );
}
