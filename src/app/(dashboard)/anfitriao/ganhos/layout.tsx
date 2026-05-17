import { requireHostPanel } from "@/lib/account-access";

export default async function AnfitriaoGanhosLayout({ children }: { children: React.ReactNode }) {
  await requireHostPanel();
  return children;
}
