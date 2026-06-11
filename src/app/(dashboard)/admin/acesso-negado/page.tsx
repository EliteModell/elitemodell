import Link from "next/link";
import { AdminHeader, AdminPanel, buttonStyle } from "../_components/AdminPrimitives";

export default function AdminAcessoNegadoPage() {
  return (
    <div>
      <AdminHeader title="Acesso negado" subtitle="Seu usuário é administrador, mas não possui permissão para esta área operacional." />
      <AdminPanel>
        <p style={{ color: "#94a3b8", margin: "0 0 16px" }}>
          Seu papel administrativo persistente nao possui permissao para esta funcao. Solicite a um ADMIN_MASTER que revise sua atribuicao.
        </p>
        <Link href="/admin" style={{ ...buttonStyle, textDecoration: "none" }}>Voltar ao dashboard</Link>
      </AdminPanel>
    </div>
  );
}
