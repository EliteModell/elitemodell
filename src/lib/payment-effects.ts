import { prisma } from "@/lib/prisma";
import { getProfessionalPlanPriority, parseProfessionalPlanReference } from "@/lib/professional-plans";
import { toCents } from "@/lib/money";
import { getPremiumUpsellPlan, premiumUpsellUntil } from "@/lib/client-plans";

export async function applyPaidPaymentEffects(paymentId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) return { applied: false, reason: "payment_not_found" as const };
      if (payment.benefitStatus === "APPLIED") {
        if (payment.status !== "PAID") {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "PAID", paidAt: payment.paidAt ?? new Date() },
          });
        }
        return { applied: false, reason: "already_applied" as const };
      }
      if (["REFUNDED", "CANCELLED", "EXPIRED", "CHARGEBACK"].includes(payment.status)) {
        return { applied: false, reason: "payment_not_eligible" as const };
      }

      const premiumIntent = await tx.premiumPurchaseIntent.findUnique({
        where: { paymentId: payment.id },
        select: { id: true, planId: true, claimedByUserId: true },
      });
      const effectivePremiumUntil = premiumIntent
        ? premiumUpsellUntil(getPremiumUpsellPlan(premiumIntent.planId as Parameters<typeof getPremiumUpsellPlan>[0]), payment.paidAt ?? new Date())
        : payment.premiumUntil;
      if (payment.premiumUntil && !payment.userId && premiumIntent) {
        if (payment.benefitStatus === "AWAITING_CLAIM") {
          return { applied: false, reason: "awaiting_claim" as const };
        }
        const paidAt = payment.paidAt ?? new Date();
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            paidAt,
            benefitStatus: "AWAITING_CLAIM",
            benefitError: null,
            premiumUntil: effectivePremiumUntil,
          },
        });
        await tx.premiumPurchaseIntent.update({
          where: { id: premiumIntent.id },
          data: {
            status: "PAID_AWAITING_ACCOUNT",
            paidAt,
          },
        });
        await tx.premiumPurchaseEvent.create({
          data: {
            intentId: premiumIntent.id,
            type: "PAYMENT_CONFIRMED_AWAITING_ACCOUNT",
            metadata: { paymentId: payment.id },
          },
        });
        return { applied: false, reason: "awaiting_claim" as const };
      }

      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, benefitStatus: { in: ["PENDING", "FAILED", "AWAITING_CLAIM"] } },
        data: {
          status: "PAID",
          paidAt: payment.paidAt ?? new Date(),
          benefitStatus: "PROCESSING",
          benefitError: null,
          ...(premiumIntent ? { premiumUntil: effectivePremiumUntil } : {}),
        },
      });
      if (!claimed.count) return { applied: false, reason: "already_processing" as const };

      if (payment.bookingId) {
        const booking = await tx.booking.update({
          where: { id: payment.bookingId },
          data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
        await tx.bookingFinancialEvent.create({
          data: {
            bookingId: booking.id,
            paymentId: payment.id,
            type: "PAYMENT_CONFIRMED",
            status: "COMPLETED",
            grossCents: booking.totalPriceCents ?? toCents(booking.totalPrice),
            platformFeeCents: booking.serviceFeeCents ?? toCents(booking.serviceFee),
            hostNetCents: booking.hostPayoutCents ?? toCents(booking.hostPayout ?? 0),
          },
        });
      }

      if (payment.userId && payment.creditAmount && payment.creditAmount > 0) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { credits: { increment: payment.creditAmount } },
          select: { id: true },
        });
      }

      if (payment.userId && effectivePremiumUntil) {
        const user = await tx.user.findUnique({
          where: { id: payment.userId },
          select: { premiumUntil: true },
        });
        const current = user?.premiumUntil?.getTime() ?? 0;
        await tx.user.update({
          where: { id: payment.userId },
          data: { premiumUntil: new Date(Math.max(current, effectivePremiumUntil.getTime())) },
          select: { id: true },
        });
      }

      const professionalPlan = parseProfessionalPlanReference(payment.externalReference);
      if (payment.userId && professionalPlan) {
        const professional = await tx.professional.findUnique({
          where: { userId: payment.userId },
          select: { id: true, listingPhoneUntil: true },
        });

        if (professional) {
          const update: {
            featured?: boolean;
            boostActive?: boolean;
            boostStartedAt?: Date;
            boostUntil?: Date | null;
            boostSource?: string | null;
            hideAge?: boolean;
            listingPhoneUntil?: Date | null;
            activePlanId?: string | null;
            planPriority?: number;
          } = {};

          update.activePlanId = professionalPlan.plan.id;
          update.planPriority = getProfessionalPlanPriority(professionalPlan.plan.id);
          if (professionalPlan.plan.benefits.featured) update.featured = true;
          if (professionalPlan.plan.benefits.hideAge) update.hideAge = true;
          if (professionalPlan.plan.benefits.showPhone && payment.premiumUntil) {
            const currentListingPhoneUntil = professional.listingPhoneUntil?.getTime() ?? 0;
            update.listingPhoneUntil = new Date(Math.max(currentListingPhoneUntil, payment.premiumUntil.getTime()));
          }
          if (professionalPlan.plan.benefits.boost) {
            update.boostActive = true;
            update.boostStartedAt = new Date();
            update.boostUntil = payment.premiumUntil ?? null;
            update.boostSource = professionalPlan.plan.id;
          }

          await tx.professional.update({
            where: { id: professional.id },
            data: update,
            select: { id: true },
          });
          await tx.professionalProfileEvent.create({
            data: {
              professionalId: professional.id,
              eventType: "PLAN_ACTIVATED",
              metadata: {
                paymentId: payment.id,
                planId: professionalPlan.plan.id,
                planName: professionalPlan.plan.name,
                priceKey: professionalPlan.price.key,
                activationMode: professionalPlan.activationMode,
                points: professionalPlan.plan.points,
                amount: payment.amount,
                premiumUntil: payment.premiumUntil?.toISOString() ?? null,
              },
            },
          });
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          benefitStatus: "APPLIED",
          benefitAppliedAt: new Date(),
          benefitError: null,
        },
      });
      if (premiumIntent) {
        await tx.premiumPurchaseIntent.update({
          where: { id: premiumIntent.id },
          data: {
            status: "ACTIVE",
            paidAt: payment.paidAt ?? new Date(),
            claimedAt: payment.userId ? new Date() : undefined,
            claimedByUserId: payment.userId ?? premiumIntent.claimedByUserId,
          },
        });
        await tx.premiumPurchaseEvent.create({
          data: {
            intentId: premiumIntent.id,
            type: "PREMIUM_ACCESS_APPLIED",
            metadata: {
              paymentId: payment.id,
              userId: payment.userId,
              premiumUntil: effectivePremiumUntil?.toISOString() ?? null,
            },
          },
        });
      }
      return { applied: true, reason: "paid" as const };
    });
  } catch (cause) {
    await prisma.payment.updateMany({
      where: { id: paymentId, benefitStatus: { not: "APPLIED" } },
      data: {
        benefitStatus: "FAILED",
        benefitError: cause instanceof Error ? cause.message : "Falha desconhecida na ativacao.",
      },
    }).catch(() => undefined);
    throw cause;
  }
}

export async function reversePaidPaymentEffects(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.benefitStatus === "REVERSED") return { reversed: false };

    if (payment.bookingId) {
      const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
      if (booking) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: "REFUNDED",
            status: booking.status === "COMPLETED" ? "COMPLETED" : "CANCELLED",
            cancelledAt: booking.cancelledAt ?? new Date(),
          },
        });
        await tx.bookingFinancialEvent.create({
          data: {
            bookingId: booking.id,
            paymentId: payment.id,
            type: "PAYMENT_REFUNDED",
            status: "COMPLETED",
            grossCents: booking.totalPriceCents ?? toCents(booking.totalPrice),
            platformFeeCents: booking.serviceFeeCents ?? toCents(booking.serviceFee),
            hostNetCents: booking.hostPayoutCents ?? toCents(booking.hostPayout ?? 0),
            refundCents: payment.amountCents ?? toCents(payment.amount),
          },
        });
      }
    }

    if (payment.userId && payment.creditAmount && payment.creditAmount > 0) {
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { credits: true },
      });
      if (user) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { credits: Math.max(0, user.credits - payment.creditAmount) },
        });
      }
    }

    if (payment.userId && payment.premiumUntil) {
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { premiumUntil: true },
      });
      if (user?.premiumUntil && user.premiumUntil <= payment.premiumUntil) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { premiumUntil: null },
        });
      }
    }

    const premiumIntent = await tx.premiumPurchaseIntent.findUnique({
      where: { paymentId: payment.id },
      select: { id: true },
    });
    if (premiumIntent) {
      await tx.premiumPurchaseIntent.update({
        where: { id: premiumIntent.id },
        data: { status: payment.status === "CHARGEBACK" ? "CHARGEBACK" : "REFUNDED" },
      });
      await tx.premiumPurchaseEvent.create({
        data: {
          intentId: premiumIntent.id,
          type: "PREMIUM_ACCESS_REVERSED",
          metadata: { paymentId: payment.id, paymentStatus: payment.status },
        },
      });
    }

    const professionalPlan = parseProfessionalPlanReference(payment.externalReference);
    if (payment.userId && professionalPlan) {
      const professional = await tx.professional.findUnique({
        where: { userId: payment.userId },
        select: { id: true, boostSource: true, boostUntil: true, listingPhoneUntil: true, activePlanId: true },
      });
      if (professional) {
        await tx.professional.update({
          where: { id: professional.id },
          data: {
            ...(professional.boostSource === professionalPlan.plan.id
              ? { boostActive: false, boostUntil: null, boostSource: null }
              : {}),
            ...(payment.premiumUntil && professional.listingPhoneUntil && professional.listingPhoneUntil <= payment.premiumUntil
              ? { listingPhoneUntil: null }
              : {}),
            ...(professional.activePlanId === professionalPlan.plan.id
              ? { activePlanId: null, planPriority: 0 }
              : {}),
          },
        });
        await tx.professionalProfileEvent.create({
          data: {
            professionalId: professional.id,
            eventType: "PLAN_REFUNDED",
            metadata: { paymentId: payment.id, planId: professionalPlan.plan.id },
          },
        });
      }
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        benefitStatus: "REVERSED",
        benefitReversedAt: new Date(),
        benefitError: null,
      },
    });
    return { reversed: true };
  });
}
