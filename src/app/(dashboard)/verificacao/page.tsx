import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VerificacaoClient from "./VerificacaoClient";

export const dynamic = "force-dynamic";

export default async function VerificacaoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      clientStatus: true,
      kycSubmittedAt: true,
      kycRejectionReason: true,
      name: true,
    },
  });

  if (!user) redirect("/login");

  // Admin e HOST não passam por verificação de cliente
  if (session.user.role === "ADMIN" || session.user.role === "HOST") {
    redirect("/dashboard");
  }

  // Já verificado → redireciona para o dashboard
  if (user.clientStatus === "VERIFIED") redirect("/dashboard");

  return (
    <VerificacaoClient
      status={user.clientStatus}
      name={user.name}
      submittedAt={user.kycSubmittedAt?.toISOString() ?? null}
      rejectionReason={user.kycRejectionReason ?? null}
    />
  );
}
