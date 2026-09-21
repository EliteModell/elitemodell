import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDigitCallbackDestination, verifyDigitCallbackState } from "@/lib/didit-callback";

export const dynamic = "force-dynamic";

// Identity providers redirect here after the user completes or abandons the flow.
// The real decision is validated server-side; this page only returns to the correct account flow.
export default async function VerificacaoCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const callbackSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  const professionalStateValid = verifyDigitCallbackState(
    typeof query.state === "string" ? query.state : null,
    callbackSecret,
  );
  const activeProfessionalDigit = user
    ? await prisma.professional.findFirst({
      where: {
        userId: user.id,
        kycProvider: "DIDIT",
        OR: [{ kycSessionId: { not: null } }, { verificationUrl: { not: null } }],
      },
      select: { id: true },
    })
    : null;

  redirect(resolveDigitCallbackDestination({
    user: user ?? null,
    hasActiveProfessionalDigit: Boolean(activeProfessionalDigit),
    professionalStateValid,
  }));
}
