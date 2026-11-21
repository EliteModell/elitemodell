import { requireAuthenticatedAccount } from "@/lib/account-access";
import { notFound } from "next/navigation";
import { identityEnabled } from "@/lib/manual-identity-policy";
import ManualIdentityWizard from "./wizard";

export default async function Page() {
  if (!identityEnabled()) notFound();
  const access = await requireAuthenticatedAccount();
  if (!access.hasCompanionRequest && access.user.accountType !== "professional") notFound();
  return <ManualIdentityWizard />;
}
