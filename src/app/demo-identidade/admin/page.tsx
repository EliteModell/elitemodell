import { requireAdmin } from "@/lib/admin-access";
import Queue from "./queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demonstração da fila documental", robots: { index: false, follow: false } };

export default async function Page() {
  await requireAdmin("kyc:review");
  return <Queue />;
}
