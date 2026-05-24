import { prisma } from "@/lib/prisma";

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

    return { applied: true, reason: "paid" as const };
  });
}
