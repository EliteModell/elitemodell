export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_PLANS, resolveClientPlanPrice } from "@/lib/client-plans";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const hasPaid = await prisma.payment.findFirst({
    where: {
      userId: session.user.id,
      status: "PAID",
      premiumUntil: { not: null },
      creditAmount: null,
      bookingId: null,
      externalReference: { startsWith: "client-premium:" },
    },
    select: { id: true },
  });

  const isFirstPurchase = hasPaid === null;

  const prices = Object.fromEntries(
    CLIENT_PLANS.map((plan) => [plan.id, resolveClientPlanPrice(plan, isFirstPurchase)])
  ) as Record<string, number>;

  return NextResponse.json({ isFirstPurchase, prices });
}
