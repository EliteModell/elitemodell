import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ClaimWebhookEventInput = {
  provider: string;
  eventId: string;
  eventType?: string | null;
  resourceId?: string | null;
  payload?: Prisma.InputJsonValue;
};

function isUniqueConstraintError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function claimWebhookEvent(input: ClaimWebhookEventInput) {
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType ?? null,
        resourceId: input.resourceId ?? null,
        payload: input.payload,
      },
    });
    return { claimed: true, event };
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;

    const existing = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: input.provider, eventId: input.eventId } },
    });

    if (existing?.status === "FAILED") {
      const event = await prisma.webhookEvent.update({
        where: { provider_eventId: { provider: input.provider, eventId: input.eventId } },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          eventType: input.eventType ?? existing.eventType,
          resourceId: input.resourceId ?? existing.resourceId,
          payload: input.payload,
          error: null,
          processedAt: null,
        },
      });
      return { claimed: true, event };
    }

    return { claimed: false, event: existing };
  }
}

export async function markWebhookEventDone(
  provider: string,
  eventId: string,
  status: "PROCESSED" | "IGNORED" = "PROCESSED",
) {
  await prisma.webhookEvent.update({
    where: { provider_eventId: { provider, eventId } },
    data: { status, processedAt: new Date(), error: null },
  });
}

export async function markWebhookEventFailed(provider: string, eventId: string, err: unknown) {
  await prisma.webhookEvent.update({
    where: { provider_eventId: { provider, eventId } },
    data: {
      status: "FAILED",
      error: err instanceof Error ? err.message.slice(0, 2000) : String(err).slice(0, 2000),
    },
  });
}
