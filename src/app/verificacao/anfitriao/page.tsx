import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

export default async function VerificacaoAnfitriaoPage() {
  const access = await requireAuthenticatedAccount();

  if (access.hostApproved) redirect(ACCOUNT_ROUTES.painelAnfitriao);

  const hasProperty = access.user.properties.length > 0;
  const title = hasProperty ? "Imóvel aguardando aprovação" : "Cadastro de imóvel em andamento";
  const description = hasProperty
    ? "Seu ambiente reservado foi enviado para curadoria. O painel de anfitrião será liberado apenas depois da aprovação."
    : "Cadastre os dados do imóvel, fotos, regras e disponibilidade para iniciar a análise.";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050505", color: "#f4f1ea", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 520, border: "1px solid rgba(212,168,67,0.24)", borderRadius: 16, background: "#101010", padding: 28, textAlign: "center" }}>
        <p style={{ margin: "0 0 10px", color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase" }}>Verificação de anfitrião</p>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{title}</h1>
        <p style={{ margin: "14px 0 24px", color: "#9f978b", lineHeight: 1.6 }}>{description}</p>
        <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ display: "inline-flex", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 999, background: GOLD, color: "#050505", padding: "0 20px", textDecoration: "none", fontWeight: 900 }}>
          Cadastrar meu imóvel
        </Link>
      </section>
    </main>
  );
}
