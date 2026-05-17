import { requireCompanionPanel } from "@/lib/account-access";

export default async function ProfissionalPlanosLayout({ children }: { children: React.ReactNode }) {
  await requireCompanionPanel();
  return children;
}
