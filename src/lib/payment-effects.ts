import { prisma } from "@/lib/prisma";
import { parseProfessionalPlanReference } from "@/lib/professional-plans";

export async function applyPaidPaymentEffects(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return { applied: false, reason: "payment_not_found" as const };

    const paid = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (paid.count === 0) {
      return { applied: false, reason: "already_paid" as const };
    }

    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
        select: { id: true },
      });
    }

    if (payment.userId && payment.creditAmount && payment.creditAmount > 0) {
      await tx.user.update({
        where: { id: payment.userId },
        data: { credits: { increment: payment.creditAmount } },
        select: { id: true },
      });
    }

    if (payment.userId && payment.premiumUntil) {
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { premiumUntil: true },
      });
      const current = user?.premiumUntil?.getTime() ?? 0;
      const next = payment.premiumUntil.getTime();
      await tx.user.update({
        where: { id: payment.userId },
        data: { premiumUntil: new Date(Math.max(current, next)) },
        select: { id: true },
      });
    }

    const professionalPlan = parseProfessionalPlanReference(payment.externalReference);
    if (payment.userId && professionalPlan) {
      const professional = await tx.professional.findUnique({
        where: { userId: payment.userId },
        select: { id: true },
      });

      if (professional) {
        const update: {
          featured?: boolean;
          boostActive?: boolean;
          boostStartedAt?: Date;
          boostUntil?: Date | null;
          boostSource?: string | null;
          hideAge?: boolean;
          hidePhone?: boolean;
        } = {};

        if (professionalPlan.plan.benefits.featured) update.featured = true;
        if (professionalPlan.plan.benefits.hideAge) update.hideAge = true;
        if (professionalPlan.plan.benefits.showPhone) update.hidePhone = false;
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
          select: { id: true },
        });
      }
    }

    return { applied: true, reason: "paid" as const };
  });
}
