// Consulta status de um pagamento local. Usado pelo frontend para polling PIX.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const { id } = await params;

  const payment = await prisma.payment.findFirst({
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
    },
  });

  if (!payment) return NextResponse.json({ error: "Pagamento nao encontrado." }, { status: 404 });

  return NextResponse.json({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    method: payment.method,
    paidAt: payment.paidAt?.toISOString() ?? null,
    creditAmount: payment.creditAmount ?? null,
    premiumUntil: payment.premiumUntil?.toISOString() ?? null,
  });
}
