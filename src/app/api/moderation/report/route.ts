export const dynamic = "force-dynamic";

import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP, sanitizeInput } from "@/lib/security";

const emergencyReasons = new Set([
  "POSSIBLE_MINOR",
  "CHILD_SEXUALIZATION",
  "EXPLOITATION_COERCION",
  "HUMAN_TRAFFICKING",
  "PHYSICAL_RISK",
  "UNAUTHORIZED_IMAGE",
]);

const schema = z.object({
  targetType: z.enum(["PROFESSIONAL", "PROPERTY", "PHOTO", "VIDEO", "STORY", "CONTENT"]),
  targetId: z.string().min(1).max(160),
  reason: z.enum([
    "POSSIBLE_MINOR", "CHILD_SEXUALIZATION", "EXPLOITATION_COERCION",
    "HUMAN_TRAFFICKING", "PHYSICAL_RISK", "UNAUTHORIZED_IMAGE",
    "FAKE_PROFILE", "FAKE_DOCUMENT", "FRAUD_SCAM", "ILLEGAL_CONTENT",
    "HARASSMENT", "ACCOUNT_TAKEOVER", "OTHER",
  ]),
  description: z.string().min(20).max(2000),
  contact: z.string().max(240).optional(),
});

function protocol() {
  return `MOD-${new Date().getFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function evidenceHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function auditTargetType(targetType: string): "PROFESSIONAL" | "PROPERTY" | "CONTENT" {
  if (targetType === "PROFESSIONAL") return "PROFESSIONAL";
  if (targetType === "PROPERTY") return "PROPERTY";
  return "CONTENT";
}

async function applyCautionaryWithdrawal(
  tx: Prisma.TransactionClient,
  target: z.infer<typeof schema>,
  now: Date,
) {
  const reason = `Retirada cautelar por denuncia emergencial: ${target.reason}`;
  const result: Record<string, unknown> = { targetType: target.targetType, targetId: target.targetId };

  if (target.targetType === "PROFESSIONAL") {
    const updated = await tx.professional.updateMany({
      where: { id: target.targetId },
      data: {
        status: "SUSPENDED",
        verified: false,
        boostActive: false,
        pauseStartedAt: now,
        pauseReason: reason,
        rejectReason: reason,
      },
    });
    result.professionalsSuspended = updated.count;
  }

  if (target.targetType === "PROPERTY") {
    const updated = await tx.property.updateMany({
      where: { id: target.targetId },
      data: { status: "INACTIVE" },
    });
    result.propertiesRestricted = updated.count;
  }

  if (target.targetType === "PHOTO") {
    const hidden = await tx.professionalPhoto.deleteMany({
      where: {
        OR: [
          { id: target.targetId },
          { url: target.targetId },
        ],
      },
    });
    const asset = await tx.uploadAsset.updateMany({
      where: {
        OR: [
          { id: target.targetId },
          { controlledUrl: target.targetId },
        ],
      },
      data: {
        status: "REJECTED",
        moderationStatus: "REJECTED",
        rejectedAt: now,
        reviewReason: reason,
      },
    });
    result.photosHidden = hidden.count;
    result.assetsRejected = asset.count;
  }

  if (target.targetType === "VIDEO") {
    const profiles = await tx.professional.updateMany({
      where: {
        OR: [
          { id: target.targetId },
          { presentationVideoUrl: target.targetId },
          { presentationVideoUrl: { contains: target.targetId } },
        ],
      },
      data: {
        presentationVideoUrl: null,
        presentationVideoStatus: "REJECTED",
        presentationVideoRejectReason: reason,
      },
    });
    const asset = await tx.uploadAsset.updateMany({
      where: {
        OR: [
          { id: target.targetId },
          { controlledUrl: target.targetId },
        ],
      },
      data: {
        status: "REJECTED",
        moderationStatus: "REJECTED",
        rejectedAt: now,
        reviewReason: reason,
      },
    });
    result.videosHidden = profiles.count;
    result.assetsRejected = asset.count;
  }

  if (target.targetType === "STORY") {
    const stories = await tx.story.updateMany({
      where: { id: target.targetId },
      data: { expiresAt: now },
    });
    result.storiesExpired = stories.count;
  }

  if (target.targetType === "CONTENT") {
    const [assets, stories] = await Promise.all([
      tx.uploadAsset.updateMany({
        where: {
          OR: [
            { id: target.targetId },
            { controlledUrl: target.targetId },
          ],
        },
        data: {
          status: "REJECTED",
          moderationStatus: "REJECTED",
          rejectedAt: now,
          reviewReason: reason,
        },
      }),
      tx.story.updateMany({
        where: { id: target.targetId },
        data: { expiresAt: now },
      }),
    ]);
    result.assetsRejected = assets.count;
    result.storiesExpired = stories.count;
  }

  return result;
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIP(req);
  const limited = await enforceRateLimitAsync(`public-report:${ipAddress}`, 5, 60 * 60 * 1000);
  if (limited) return limited;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const session = await getServerSession(authOptions);
  const emergency = emergencyReasons.has(parsed.data.reason);
  const reportProtocol = protocol();
  const now = new Date();
  const notes = sanitizeInput(parsed.data.description);
  const snapshot = {
    protocol: reportProtocol,
    receivedAt: now.toISOString(),
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
    description: notes,
    contactProvided: Boolean(parsed.data.contact),
    reporterId: session?.user?.id ?? null,
    ipPresent: ipAddress !== "unknown",
  };

  const created = await prisma.$transaction(async (tx) => {
    const moderationCase = await tx.moderationCase.create({
      data: {
        protocol: reportProtocol,
        reporterId: session?.user?.id ?? null,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reason: parsed.data.reason,
        status: emergency ? "EMERGENCY" : "RECEIVED",
        priority: emergency ? "CRITICAL" : "NORMAL",
        emergency,
        restrictedAt: emergency ? now : null,
        slaDueAt: emergency ? new Date(now.getTime() + 4 * 60 * 60 * 1000) : null,
        events: {
          create: {
            actorId: session?.user?.id ?? null,
            type: "REPORT_RECEIVED",
            toStatus: emergency ? "EMERGENCY" : "RECEIVED",
            notes,
            metadata: {
              contactProvided: Boolean(parsed.data.contact),
              source: "public-report",
              ipPresent: ipAddress !== "unknown",
            },
          },
        },
      },
    });

    if (!emergency) return moderationCase;

    const withdrawal = await applyCautionaryWithdrawal(tx, parsed.data, now);
    const withdrawalJson = JSON.parse(JSON.stringify(withdrawal)) as Prisma.InputJsonValue;
    await tx.moderationCaseEvent.create({
      data: {
        caseId: moderationCase.id,
        actorId: session?.user?.id ?? null,
        type: "CAUTIONARY_WITHDRAWAL_APPLIED",
        fromStatus: "RECEIVED",
        toStatus: "EMERGENCY",
        notes: "Retirada cautelar automatica aplicada ate revisao humana.",
        metadata: withdrawalJson,
      },
    });
    await tx.evidenceArtifact.create({
      data: {
        caseId: moderationCase.id,
        bucket: "moderation-evidence",
        storagePath: `cases/${reportProtocol}/report-${now.toISOString().replace(/[:.]/g, "-")}.json`,
        fileHash: evidenceHash(snapshot),
        mimeType: "application/json",
        originalSource: `${parsed.data.targetType}:${parsed.data.targetId}`,
        legalHold: true,
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: session?.user?.role === "ADMIN" ? session.user.id : null,
        actorIdentifier: session?.user?.id ?? `public:${ipAddress}`,
        action: "CONTENT_FLAGGED",
        targetType: auditTargetType(parsed.data.targetType),
        targetId: parsed.data.targetId,
        changes: withdrawalJson,
        reason: parsed.data.reason,
        ipAddress: ipAddress === "unknown" ? null : ipAddress,
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });

    return moderationCase;
  });
  return NextResponse.json({
    ok: true,
    protocol: created.protocol,
    emergency,
    message: emergency
      ? "Denuncia emergencial recebida; retirada cautelar aplicada ate revisao humana prioritaria."
      : "Denuncia recebida para triagem.",
  }, { status: 201 });
}
