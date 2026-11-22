import { identityRuntimeEnabled } from "@/lib/manual-identity-runtime";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { notFound } from "next/navigation";

import ManualIdentityWizard from "./wizard";

export default async function Page() {
  if (!(await identityRuntimeEnabled())) notFound();
  const access = await requireAuthenticatedAccount();
  if (!access.hasCompanionRequest && access.user.accountType !== "professional") notFound();
  return <ManualIdentityWizard />;
}
