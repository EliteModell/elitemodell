import { requireCompanionPanel } from "@/lib/account-access";

export default async function ProfissionalAgendaLayout({ children }: { children: React.ReactNode }) {
  await requireCompanionPanel();
  return children;
}
