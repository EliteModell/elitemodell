import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type EmailTrackingInput = {
  idempotencyKey?: string;
  professionalId?: string;
  category?: string;
};

function recipientFingerprint(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function maskedRecipient(email: string) {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() ?? "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
  return `${local.slice(0, 2)}***@${domainName.slice(0, 1)}***${suffix}`;
}

export async function beginEmailDelivery(
  recipient: string,
  subject: string,
  tracking: EmailTrackingInput = {},
) {
  const data = {
    recipientHash: recipientFingerprint(recipient),
    recipientMasked: maskedRecipient(recipient),
    category: tracking.category?.slice(0, 100) || "TRANSACTIONAL",
    subject: subject.slice(0, 300),
    professionalId: tracking.professionalId ?? null,
  };

  if (tracking.idempotencyKey) {
    return prisma.emailDelivery.upsert({
      where: { idempotencyKey: tracking.idempotencyKey },
      create: { ...data, idempotencyKey: tracking.idempotencyKey },
      update: {},
    });
  }
  return prisma.emailDelivery.create({ data });
}

export async function markEmailAccepted(trackingId: string, providerMessageId: string | null) {
  return prisma.emailDelivery.update({
    where: { id: trackingId },
    data: {
      providerMessageId,
      status: "ACCEPTED",
      lastEvent: "email.sent",
      lastEventAt: new Date(),
      acceptedAt: new Date(),
      failureReason: null,
    },
  });
}

export async function markEmailFailed(trackingId: string, reason: string) {
  return prisma.emailDelivery.update({
    where: { id: trackingId },
    data: {
      status: "FAILED",
      lastEvent: "email.failed",
      lastEventAt: new Date(),
      failedAt: new Date(),
      failureReason: reason.slice(0, 500),
    },
  });
}
