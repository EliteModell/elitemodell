import { requireHostPanel } from "@/lib/account-access";

export default async function AnfitriaoReservasLayout({ children }: { children: React.ReactNode }) {
  await requireHostPanel();
  return children;
}
