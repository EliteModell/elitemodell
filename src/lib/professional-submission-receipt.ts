import "server-only";

import { prisma } from "@/lib/prisma";
import { sendProfessionalSubmissionReceipt } from "@/lib/auth-email";

export type SubmissionReceiptStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

export async function deliverProfessionalSubmissionReceipt(
  professionalId: string,
  email: string,
  name?: string | null,
): Promise<SubmissionReceiptStatus> {
  await prisma.professionalSubmissionReceipt.upsert({
    where: { professionalId },
    create: { professionalId, status: "PENDING" },
    update: {},
  });

  const staleSendingBefore = new Date(Date.now() - 10 * 60 * 1000);
  const claimed = await prisma.professionalSubmissionReceipt.updateMany({
    where: {
      professionalId,
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        { status: "SENDING", updatedAt: { lt: staleSendingBefore } },
      ],
    },
    data: { status: "SENDING", attempts: { increment: 1 }, lastError: null },
  });

  if (claimed.count === 0) {
    const existing = await prisma.professionalSubmissionReceipt.findUnique({
      where: { professionalId },
      select: { status: true },
    });
    return (existing?.status as SubmissionReceiptStatus | undefined) ?? "PENDING";
  }

  try {
    const receipt = await prisma.professionalSubmissionReceipt.findUnique({ where: { professionalId }, select: { attempts: true } });
    const providerId = await sendProfessionalSubmissionReceipt(email, professionalId, name, receipt?.attempts ?? 1);
    await prisma.professionalSubmissionReceipt.update({
      where: { professionalId },
      data: { status: "SENT", providerId, sentAt: new Date(), lastError: null },
    });
    return "SENT";
  } catch (error) {
    console.error("[professional-submission-receipt] falha no comprovante", {
      professionalId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    await prisma.professionalSubmissionReceipt.update({
      where: { professionalId },
      data: { status: "FAILED", lastError: "provider_delivery_failed" },
    });
    return "FAILED";
  }
}
