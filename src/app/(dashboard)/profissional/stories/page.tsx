import { requireCompanionPanel } from "@/lib/account-access";
import { ProfessionalStoriesClient } from "@/components/professional-dashboard/ProfessionalStoriesClient";

export const dynamic = "force-dynamic";

export default async function ProfessionalStoriesPage() {
  await requireCompanionPanel();

  return <ProfessionalStoriesClient />;
}
