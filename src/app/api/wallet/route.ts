// Retorna saldo, status premium e histórico de transações do usuário.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      credits: true,
      premiumUntil: true,
      payments: {
        where: { status: { not: "PENDING" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          creditAmount: true,
          premiumUntil: true,
          paidAt: true,
          createdAt: true,
          bookingId: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });

  const now = new Date();
  const isPremium = user.premiumUntil ? user.premiumUntil > now : false;

  return NextResponse.json({
    credits: user.credits,
    premiumUntil: user.premiumUntil?.toISOString() ?? null,
    isPremium,
    transactions: user.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      status: p.status,
      creditAmount: p.creditAmount ?? null,
      premiumUntil: p.premiumUntil?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      bookingId: p.bookingId ?? null,
    })),
  });
}
