import { requireCompanionPanel } from "@/lib/account-access";
import { ProfessionalPostClient } from "@/components/professional-dashboard/ProfessionalPostClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProfessionalPostPage() {
  await requireCompanionPanel();
  return <ProfessionalPostClient />;
}
