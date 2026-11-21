import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import ManualIdentityWizard from "./wizard";
import styles from "./demo.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demonstração documental", robots: { index: false, follow: false } };

export default async function Page() {
  await requireAdmin("kyc:review");
  return <div className={styles.shell}>
    <nav className={styles.nav}><strong>ELITE MODELL</strong><Link href="/demo-identidade/admin">Painel de revisão</Link></nav>
    <ManualIdentityWizard />
  </div>;
}
