// Consulta status de um pagamento local. Usado pelo frontend para polling PIX.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAsaasConfig, getAsaasPayment } from "@/lib/asaas";
import { syncAsaasPaymentSnapshot } from "@/lib/payment-operations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const { id } = await params;

  let payment = await prisma.payment.findFirst({
    where: {
      OR: [{ id }, { providerPaymentId: id }],
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      amount: true,
      method: true,
      paidAt: true,
      creditAmount: true,
      premiumUntil: true,
      providerPaymentId: true,
      provider: true,
      providerStatus: true,
      expiresAt: true,
      refundedAmountCents: true,
      benefitStatus: true,
      benefitError: true,
      cancelledAt: true,
    },
  });

  if (!payment) return NextResponse.json({ error: "Pagamento nao encontrado." }, { status: 404 });

  if (
    payment.provider === "asaas" &&
    payment.providerPaymentId &&
    getAsaasConfig().configured &&
    ["PENDING", "PAID", "PARTIALLY_REFUNDED"].includes(payment.status)
  ) {
    try {
      const remote = await getAsaasPayment(payment.providerPaymentId);
      await syncAsaasPaymentSnapshot(payment.id, remote);
      payment = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
        select: {
          id: true,
          status: true,
          amount: true,
          method: true,
          paidAt: true,
          creditAmount: true,
          premiumUntil: true,
          providerPaymentId: true,
          provider: true,
          providerStatus: true,
          expiresAt: true,
          refundedAmountCents: true,
          benefitStatus: true,
          benefitError: true,
          cancelledAt: true,
        },
      });
    } catch {
      // O status local continua disponivel se o provedor estiver temporariamente indisponivel.
    }
  }

  return NextResponse.json({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    method: payment.method,
    paidAt: payment.paidAt?.toISOString() ?? null,
    creditAmount: payment.creditAmount ?? null,
    premiumUntil: payment.premiumUntil?.toISOString() ?? null,
    providerStatus: payment.providerStatus,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    refundedAmountCents: payment.refundedAmountCents,
    benefitStatus: payment.benefitStatus,
    benefitError: payment.benefitError,
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
  });
}
