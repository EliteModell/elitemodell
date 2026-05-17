import Link from "next/link";
import { requireHostPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export default async function ImoveisAnfitriaoPage() {
  await requireHostPanel();

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Meus espaços</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>
        A listagem privada dos seus locais de atendimento será ligada a uma API dedicada. Por enquanto, você pode cadastrar um novo espaço.
      </p>
      <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>
        Cadastrar novo espaço
      </Link>
    </div>
  );
}
