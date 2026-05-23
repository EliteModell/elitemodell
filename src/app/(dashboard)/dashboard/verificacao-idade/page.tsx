import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { normalizeClientAgeVerificationStatus } from "@/lib/client-age-verification";
import VerificacaoIdadeClient from "./VerificacaoIdadeClient";

export const dynamic = "force-dynamic";

export default async function ClientAgeVerificationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ACCOUNT_ROUTES.login);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      clientStatus: true,
      kycSessionId: true,
      kycSubmittedAt: true,
      kycRejectionReason: true,
    },
  });

  if (!user) {
    redirect(ACCOUNT_ROUTES.login);
  }

  return (
    <VerificacaoIdadeClient
      status={normalizeClientAgeVerificationStatus(user.clientStatus)}
      kycSessionId={user.kycSessionId}
      submittedAt={user.kycSubmittedAt?.toISOString() ?? null}
      rejectionReason={user.kycRejectionReason}
    />
  );
}
