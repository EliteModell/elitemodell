export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  PREMIUM_UPSELL_PLANS,
  resolvePremiumUpsellPrice,
} from "@/lib/client-plans";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({
      authenticated: false,
      premium: false,
      plans: PREMIUM_UPSELL_PLANS.map((plan) => ({
        id: plan.id,
        label: plan.label,
        durationLabel: plan.durationLabel,
        badge: plan.badge ?? null,
        price: resolvePremiumUpsellPrice(plan, true),
        regularPrice: plan.price,
        firstPurchaseOffer: plan.firstPurchasePrice != null,
      })),
    });
  }
  const [user, priorPurchase] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { premiumUntil: true },
    }),
    prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        status: "PAID",
        premiumUntil: { not: null },
      },
      select: { id: true },
    }),
  ]);
  const premium = Boolean(user?.premiumUntil && user.premiumUntil > new Date());
  return NextResponse.json({
    authenticated: true,
    premium,
    premiumUntil: user?.premiumUntil?.toISOString() ?? null,
    plans: PREMIUM_UPSELL_PLANS.map((plan) => ({
      id: plan.id,
      label: plan.label,
      durationLabel: plan.durationLabel,
      badge: plan.badge ?? null,
      price: resolvePremiumUpsellPrice(plan, !priorPurchase),
      regularPrice: plan.price,
      firstPurchaseOffer: !priorPurchase && plan.firstPurchasePrice != null,
    })),
  });
}
