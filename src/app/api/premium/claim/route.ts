export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { applyPaidPaymentEffects } from "@/lib/payment-effects";
import {
  normalizePurchaserEmail,
  PREMIUM_CLAIM_COOKIE,
  premiumClaimMatches,
  readPremiumClaim,
} from "@/lib/premium-checkout";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Entre na sua conta para vincular o acesso." }, { status: 401 });
  }
  const limited = await enforceRateLimitAsync(
    `premium-claim:${session.user.id}:${getClientIP(req)}`,
    10,
    15 * 60 * 1000,
  );
  if (limited) return limited;

  const claim = readPremiumClaim(req);
  if (!claim) {
    return NextResponse.json({ error: "Nenhuma compra pendente foi encontrada neste navegador." }, { status: 404 });
  }

  const [user, intent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    }),
    prisma.premiumPurchaseIntent.findUnique({
      where: { id: claim.intentId },
      include: { payment: true },
    }),
  ]);
  if (!user || !intent || !premiumClaimMatches(intent.claimTokenHash, claim.token)) {
    return NextResponse.json({ error: "Compra pendente invalida ou expirada." }, { status: 403 });
  }
  if (normalizePurchaserEmail(user.email) !== normalizePurchaserEmail(intent.purchaserEmail)) {
    return NextResponse.json(
      { error: "Entre com o mesmo e-mail informado no pagamento Pix." },
      { status: 409 },
    );
  }
  if (intent.payment.status !== "PAID") {
    return NextResponse.json(
      { error: "O pagamento ainda nao foi confirmado pelo provedor." },
      { status: 409 },
    );
  }
  if (intent.payment.userId && intent.payment.userId !== user.id) {
    return NextResponse.json({ error: "Esta compra ja foi vinculada a outra conta." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const attached = await tx.payment.updateMany({
        where: {
          id: intent.payment.id,
          OR: [{ userId: null }, { userId: user.id }],
        },
        data: {
          userId: user.id,
          benefitStatus: "PENDING",
          benefitError: null,
        },
      });
      if (!attached.count) throw new Error("PAYMENT_ALREADY_CLAIMED");

      await tx.premiumPurchaseIntent.update({
        where: { id: intent.id },
        data: {
          claimedByUserId: user.id,
          claimedAt: new Date(),
          status: "CLAIM_PROCESSING",
        },
      });
      await tx.premiumPurchaseEvent.create({
        data: {
          intentId: intent.id,
          type: "PURCHASE_LINKED_TO_ACCOUNT",
          metadata: { userId: user.id, paymentId: intent.payment.id },
        },
      });

      const existingAcceptance = await tx.checkoutAcceptance.findFirst({
        where: { paymentId: intent.payment.id, userId: user.id },
        select: { id: true },
      });
      if (!existingAcceptance) {
        await tx.checkoutAcceptance.create({
          data: {
            userId: user.id,
            paymentId: intent.payment.id,
            productId: intent.planId,
            productName: "Elite Modell Premium",
            totalPrice: intent.payment.amount,
            expectedEndsAt: intent.payment.premiumUntil,
            termsVersionId: intent.termsVersionId,
            refundPolicyVersionId: intent.refundPolicyVersionId,
            termsHash: intent.termsHash,
            refundPolicyHash: intent.refundPolicyHash,
            ipAddress: intent.ipAddress,
            userAgent: intent.userAgent?.slice(0, 300) ?? null,
            route: "/api/premium/checkout/pix",
            language: "pt-BR",
            acceptanceType: "CHECKOUT",
            required: true,
            acceptedAt: intent.acceptedAt,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_ALREADY_CLAIMED") {
      return NextResponse.json(
        { error: "Esta compra ja foi vinculada a outra conta." },
        { status: 409 },
      );
    }
    throw error;
  }

  try {
    const applied = await applyPaidPaymentEffects(intent.payment.id);
    const response = NextResponse.json({
      linked: true,
      accessApplied: applied.applied || applied.reason === "already_applied",
      premiumUntil: intent.payment.premiumUntil?.toISOString() ?? null,
    });
    response.cookies.set(PREMIUM_CLAIM_COOKIE, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[premium-claim] benefit_activation_failed", {
      intentId: intent.id,
      paymentId: intent.payment.id,
      userId: user.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: "Pagamento vinculado, mas a ativacao precisa ser conciliada pelo suporte." },
      { status: 503 },
    );
  }
}
