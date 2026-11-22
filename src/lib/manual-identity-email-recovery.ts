import "server-only";

import { createHash } from "node:crypto";
import { realAccountEmail } from "@/lib/account-email";
import { sendManualIdentityEmail } from "@/lib/auth-email";
import { manualIdentityEmailIdempotencyKey } from "@/lib/email-idempotency";
import { MANUAL_DOCUMENT_PROVIDER, manualAttemptAllowsPublication } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";

export async function checkManualIdentityApprovalEmail(attemptId: string) {
  const attempt = await prisma.manualIdentityAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || !manualAttemptAllowsPublication(attemptId, attempt)) return "unavailable";
  const [latest, account] = await Promise.all([
    prisma.manualIdentityAttempt.findFirst({
      where: { userId: attempt.userId, submittedAt: { not: null } },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: attempt.userId },
      select: { email: true, emailVerified: true, blocked: true, professional: {
        select: { id: true, kycProvider: true, kycSessionId: true, kycStatus: true },
      } },
    }),
  ]);
  const profile = account?.professional;
  const email = account?.emailVerified && !account.blocked ? realAccountEmail(account.email) : null;
  if (latest?.id !== attemptId || !email || profile?.kycProvider !== MANUAL_DOCUMENT_PROVIDER ||
      profile.kycSessionId !== attemptId || profile.kycStatus !== "APPROVED") return "unavailable";

  const key = manualIdentityEmailIdempotencyKey(attemptId, "approved", attempt.reviewVersion);
  const original = await prisma.emailDelivery.findUnique({ where: { idempotencyKey: key } });
  const recipientHash = createHash("sha256").update(email.toLowerCase()).digest("hex");
  if (!original || original.recipientHash !== recipientHash || original.professionalId !== profile.id) return "unconfirmed";
  const previousRetry = await prisma.emailDelivery.findUnique({ where: { idempotencyKey: key + ":retry:" + original.id } });
  const delivery = previousRetry ?? original;
  if (delivery.recipientHash !== recipientHash || delivery.professionalId !== profile.id) return "unconfirmed";
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
    await sendManualIdentityEmail({
      email, professionalId: profile.id, attemptId, event: "approved",
      reviewVersion: attempt.reviewVersion, retryForDeliveryId: original.id,
    });
    return "resent";
  } catch {
    return "failed";
  }
}
