import { requireCompanionPanel } from "@/lib/account-access";

export default async function ProfissionalFotosLayout({ children }: { children: React.ReactNode }) {
  await requireCompanionPanel();
  return children;
}
