import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

export function verifyResendWebhookSignature(input: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
  now?: number;
}) {
  const timestamp = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > MAX_WEBHOOK_AGE_SECONDS) return false;
  const encodedSecret = input.secret.startsWith("whsec_") ? input.secret.slice(6) : input.secret;
  let secret: Buffer;
  try {
    secret = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  if (!secret.length) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.id}.${input.timestamp}.${input.payload}`)
    .digest();
  return input.signature.split(" ").some((candidate) => {
    const encoded = candidate.startsWith("v1,") ? candidate.slice(3) : "";
    if (!encoded) return false;
    let received: Buffer;
    try {
      received = Buffer.from(encoded, "base64");
    } catch {
      return false;
    }
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export function resendDeliveryUpdate(eventType: string, occurredAt: Date) {
  if (eventType === "email.sent" || eventType === "email.delivery_delayed") {
    return { status: "ACCEPTED" as const, lastEvent: eventType, lastEventAt: occurredAt, acceptedAt: occurredAt };
  }
  if (eventType === "email.delivered") {
    return { status: "DELIVERED" as const, lastEvent: eventType, lastEventAt: occurredAt, deliveredAt: occurredAt, failureReason: null };
  }
  if (["email.bounced", "email.complained", "email.suppressed"].includes(eventType)) {
    return { status: "REJECTED" as const, lastEvent: eventType, lastEventAt: occurredAt, rejectedAt: occurredAt, failureReason: eventType };
  }
  if (eventType === "email.failed") {
    return { status: "FAILED" as const, lastEvent: eventType, lastEventAt: occurredAt, failedAt: occurredAt, failureReason: eventType };
  }
  return null;
}

export function shouldApplyResendEvent(current: { status: string; lastEventAt: Date | null }, next: { status: string; lastEventAt: Date }) {
  if (current.lastEventAt && next.lastEventAt < current.lastEventAt) return false;
  const terminal = ["DELIVERED", "REJECTED", "FAILED"].includes(current.status);
  return !(terminal && next.status === "ACCEPTED");
}
