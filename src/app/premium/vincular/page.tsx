import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import PremiumClaimClient from "./PremiumClaimClient";

function safeReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }
  return candidate;
}

export default async function PremiumClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnUrl);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const claimPage = `/premium/vincular?returnUrl=${encodeURIComponent(returnTo)}`;
    redirect(`${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(claimPage)}`);
  }

  return <PremiumClaimClient returnTo={returnTo} />;
}
