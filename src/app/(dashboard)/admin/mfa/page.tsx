import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  await requireAdminIdentity("dashboard:view");
  redirect("/admin");
}
