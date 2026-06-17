export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAsaasConfig, getAsaasPayment } from "@/lib/asaas";
import { syncAsaasPaymentSnapshot } from "@/lib/payment-operations";
import {
  premiumClaimMatches,
  readPremiumClaim,
} from "@/lib/premium-checkout";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimitAsync(
    `premium-status:${getClientIP(req)}`,
    60,
    10 * 60 * 1000,
  );
  if (limited) return limited;

  const { id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const claim = readPremiumClaim(req);
  let intent = await prisma.premiumPurchaseIntent.findUnique({
    where: { id },
    include: { payment: true },
  });
  if (!intent) {
    return NextResponse.json({ error: "Compra nao encontrada." }, { status: 404 });
  }

  const cookieAuthorized =
    claim?.intentId === intent.id &&
    premiumClaimMatches(intent.claimTokenHash, claim.token);
  const sessionAuthorized =
    Boolean(session?.user?.id) &&
    (intent.claimedByUserId === session?.user?.id ||
      intent.payment.userId === session?.user?.id);
  if (!cookieAuthorized && !sessionAuthorized) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (
    intent.payment.provider === "asaas" &&
    intent.payment.providerPaymentId &&
    getAsaasConfig().configured &&
    ["PENDING", "PAID"].includes(intent.payment.status)
  ) {
    try {
      const remote = await getAsaasPayment(intent.payment.providerPaymentId);
      await syncAsaasPaymentSnapshot(intent.payment.id, remote);
      intent = await prisma.premiumPurchaseIntent.findUniqueOrThrow({
        where: { id: intent.id },
        include: { payment: true },
      });
    } catch {
      // Mantem o snapshot local quando o provedor estiver temporariamente indisponivel.
    }
  }

  return NextResponse.json({
    intentId: intent.id,
    status: intent.payment.status,
    providerStatus: intent.payment.providerStatus,
    benefitStatus: intent.payment.benefitStatus,
    intentStatus: intent.status,
    paid: intent.payment.status === "PAID",
    requiresAccount:
      intent.payment.status === "PAID" && !intent.payment.userId,
    accessApplied: intent.payment.benefitStatus === "APPLIED",
    expiresAt: intent.payment.expiresAt?.toISOString() ?? null,
    premiumUntil: intent.payment.premiumUntil?.toISOString() ?? null,
    planId: intent.planId,
  });
}
