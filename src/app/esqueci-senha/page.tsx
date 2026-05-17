import Link from "next/link";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default function EsqueciSenhaPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#060e1b", color: "#f1f5f9", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#0b1420", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 10px" }}>Recuperar senha</h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
          A recuperação de senha pelo Supabase ainda precisa ser conectada a uma tela com envio de email seguro.
        </p>
        <Link href={ACCOUNT_ROUTES.login} style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>
          Voltar para login
        </Link>
      </div>
    </main>
  );
}
