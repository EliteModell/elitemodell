import { requireCompanionPanel } from "@/lib/account-access";

export default async function ProfissionalAgendamentosLayout({ children }: { children: React.ReactNode }) {
  await requireCompanionPanel();
  return children;
}
