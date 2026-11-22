import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function recoverTrackedEmail({ key, retryKey = key, professionalId, email, send }: {
  key: string;
  retryKey?: string;
  professionalId: string;
  email: string;
  send: (originalDeliveryId: string) => Promise<void>;
}) {
  const original = await prisma.emailDelivery.findUnique({ where: { idempotencyKey: key } });
  const recipientHash = createHash("sha256").update(email.toLowerCase()).digest("hex");
  if (!original || original.recipientHash !== recipientHash || original.professionalId !== professionalId) return "unconfirmed";
  const previousRetry = await prisma.emailDelivery.findUnique({ where: { idempotencyKey: retryKey + ":retry:" + original.id } });
  const delivery = previousRetry ?? original;
  if (delivery.recipientHash !== recipientHash || delivery.professionalId !== professionalId) return "unconfirmed";
  if (delivery.status === "DELIVERED") return "delivered";
  if (delivery.status === "REJECTED") return "rejected";

  let failed = delivery.lastEvent === "email.failed" && Boolean(delivery.providerMessageId) &&
    delivery.failureReason === "email.failed";
  if (delivery.providerMessageId && !failed) {
    const credentials = process.env.RESEND_API_KEY?.trim();
    if (!credentials) return "unconfirmed";
    const response = await fetch("https://api.resend.com/emails/" + encodeURIComponent(delivery.providerMessageId), {
      headers: { Authorization: "Bearer " + credentials },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    if (!response?.ok) return "unconfirmed";
    const provider = await response.json().catch(() => null) as { id?: string; to?: string[]; last_event?: string } | null;
    if (!provider || provider.id !== delivery.providerMessageId ||
        !Array.isArray(provider.to) || !provider.to.some((address) => String(address).toLowerCase() === email.toLowerCase())) return "unconfirmed";
    if (provider.last_event === "delivered") return "delivered";
    if (["bounced", "complained", "suppressed"].includes(provider.last_event ?? "")) return "rejected";
    failed = provider.last_event === "failed";
  }

  // A timeout or an unconfirmed acceptance is ambiguous. Only retry a definitive failure.
  const definitivelyRefused = delivery.status === "FAILED" && !delivery.providerMessageId &&
    /^(provider-not-configured|provider-http-(400|401|403|422|429))$/.test(delivery.failureReason ?? "");
  if (!failed && !definitivelyRefused) return "unconfirmed";
  if (previousRetry) return "failed";

  try {
    await send(original.id);
    return "resent";
  } catch {
    return "failed";
  }
}
