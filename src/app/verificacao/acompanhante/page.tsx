import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

export default async function VerificacaoAcompanhantePage() {
  const access = await requireAuthenticatedAccount();

  if (access.companionApproved) redirect(ACCOUNT_ROUTES.painelAcompanhante);

  const status = access.companionStatus;
  const title = !status || status === "DRAFT"
    ? "Ativação profissional em andamento"
    : status === "REJECTED"
      ? "Perfil profissional precisa de ajustes"
      : "Perfil profissional em análise";
  const description = !status || status === "DRAFT"
    ? "Complete os dados, documentos, fotos e verificação para enviar seu perfil à equipe."
    : status === "REJECTED"
      ? access.user.professional?.rejectReason ?? "Revise as informações solicitadas e envie novamente para análise."
      : "Recebemos seu cadastro. O painel profissional será liberado apenas após aprovação.";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050505", color: "#f4f1ea", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 520, border: "1px solid rgba(212,168,67,0.24)", borderRadius: 16, background: "#101010", padding: 28, textAlign: "center" }}>
        <p style={{ margin: "0 0 10px", color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase" }}>Verificação de acompanhante</p>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{title}</h1>
        <p style={{ margin: "14px 0 24px", color: "#9f978b", lineHeight: 1.6 }}>{description}</p>
        <Link href={ACCOUNT_ROUTES.onboardingAcompanhante} style={{ display: "inline-flex", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 999, background: GOLD, color: "#050505", padding: "0 20px", textDecoration: "none", fontWeight: 900 }}>
          Ativar perfil profissional
        </Link>
      </section>
    </main>
  );
}
