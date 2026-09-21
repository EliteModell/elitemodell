export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import {
  canRetryDigitStatus,
  buildDigitVendorData,
  createDigitSession,
  createDigitIntentMarker,
  digitVendorDataBelongsToUser,
  digitStatusWhenProviderUnavailable,
  DIDIT_APPROVED_STATUS,
  DIDIT_PENDING_STATUS,
  DIDIT_REJECTED_STATUS,
  fetchDigitSessionDecision,
  findDigitSessionByVendorData,
  isSafeDigitVerificationUrl,
  isDigitAvailable,
  parseDigitIntentMarker,
  type DiditVerificationStatus,
} from "@/lib/didit";
import { assessProfessionalDiditDecision } from "@/lib/professional-didit";
import { prisma } from "@/lib/prisma";
import { createDigitCallbackState } from "@/lib/didit-callback";

const DIGIT_INTENT_LEASE_MS = 2 * 60_000;
const DIGIT_INTENT_EXPIRATION_MS = 7 * 24 * 60 * 60_000;

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function canUseProfessionalKyc(session: {
  user: {
    role?: string | null;
    activeProfileType?: string | null;
    accountType?: string | null;
    isProfessional?: boolean | null;
  };
}) {
  return Boolean(
    session.user.role === "ADMIN" ||
      session.user.activeProfileType === "PROFESSIONAL" ||
      session.user.accountType === "model" ||
      session.user.accountType === "professional" ||
      session.user.isProfessional,
  );
}

async function persistStatus(userId: string, sessionId: string, status: DiditVerificationStatus, reason: string | null) {
  const approved = status === DIDIT_APPROVED_STATUS;
  const rejected = status === DIDIT_REJECTED_STATUS;

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: userId, kycSessionId: sessionId },
      data: {
        clientStatus: approved ? "VERIFIED" : rejected ? "REJECTED" : "PENDING_REVIEW",
        kycSessionId: sessionId,
        kycSubmittedAt: approved || rejected ? undefined : new Date(),
        kycReviewedAt: approved || rejected ? new Date() : undefined,
        kycRejectionReason: rejected ? reason : null,
      },
    }),
    prisma.professional.updateMany({
      where: { userId, kycProvider: "DIDIT", kycSessionId: sessionId },
      data: {
        kycProvider: "DIDIT",
        kycSessionId: sessionId,
        kycStatus: status,
        verifStatus: approved ? "APPROVED" : rejected ? "REJECTED" : "PENDING",
        docStatus: approved ? "APPROVED" : rejected ? "REJECTED" : "PENDING",
        rejectReason: rejected ? reason : null,
        verificationUrl: approved || rejected ? null : undefined,
      },
    }),
  ]);
}

async function currentStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clientStatus: true,
      kycSessionId: true,
      kycRejectionReason: true,
      professional: { select: { kycProvider: true, kycSessionId: true, kycStatus: true, rejectReason: true, verificationUrl: true } },
    },
  });

  const professional = user?.professional;
  const sessionId = professional?.kycProvider === "DIDIT"
    ? professional.kycSessionId ?? user?.kycSessionId ?? null
    : null;
  const storedUrl = professional?.kycProvider === "DIDIT" && isSafeDigitVerificationUrl(professional.verificationUrl)
    ? professional.verificationUrl ?? null
    : null;
  if (!sessionId) {
    const starting = professional?.kycProvider === "DIDIT" && Boolean(parseDigitIntentMarker(professional.verificationUrl));
    return {
      sessionId: null,
      status: starting ? DIDIT_PENDING_STATUS : "NOT_STARTED" as const,
      rawStatus: null,
      retryAllowed: !starting,
      message: starting ? "A verificacao esta sendo preparada. Tente novamente em instantes." : null,
      url: null,
      starting,
    };
  }

  try {
    const decision = await fetchDigitSessionDecision(sessionId);
    if (!digitVendorDataBelongsToUser(decision.vendor_data, userId)) {
      throw new Error("didit_session_owner_mismatch");
    }
    const assessment = assessProfessionalDiditDecision(decision);
    await persistStatus(userId, sessionId, assessment.status, assessment.reason);
    return {
      sessionId,
      status: assessment.status,
      rawStatus: decision.status,
      retryAllowed: assessment.status === DIDIT_REJECTED_STATUS || canRetryDigitStatus(decision.status),
      message: assessment.reason,
      url: assessment.status === DIDIT_PENDING_STATUS ? storedUrl : null,
      starting: false,
    };
  } catch (error) {
    console.warn("[Didit] Nao foi possivel atualizar o status da sessao.", {
      userId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return {
      sessionId,
      status: digitStatusWhenProviderUnavailable(),
      rawStatus: null,
      retryAllowed: false,
      message: "Nao foi possivel confirmar o status atual na Didit. Tente novamente em instantes.",
      url: storedUrl,
      starting: false,
    };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (!canUseProfessionalKyc(session)) {
    return NextResponse.json({ error: "Apenas anunciantes podem consultar a verificacao." }, { status: 403 });
  }

  const verification = isDigitAvailable()
    ? await currentStatus(session.user.id)
    : { sessionId: null, status: "NOT_STARTED" as const, rawStatus: null, retryAllowed: false, message: null };

  return NextResponse.json({
    available: isDigitAvailable(),
    provider: "DIDIT",
    ...verification,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (!canUseProfessionalKyc(session)) {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar verificacao." }, { status: 403 });
  }

  if (!isDigitAvailable()) {
    return NextResponse.json(
      { error: "Verificacao Didit nao configurada.", code: "DIDIT_UNAVAILABLE", available: false },
      { status: 503 },
    );
  }

  const existing = await currentStatus(session.user.id);
  if (existing.starting) {
    return NextResponse.json(
      { error: "A verificacao esta sendo preparada. Tente novamente em instantes.", code: "DIDIT_STARTING" },
      { status: 409 },
    );
  }
  if (existing.sessionId && existing.status !== DIDIT_REJECTED_STATUS) {
    return NextResponse.json({
      provider: "DIDIT",
      ...existing,
      reused: true,
      url: existing.url,
      message: existing.status === DIDIT_APPROVED_STATUS
        ? "Identidade verificada."
        : "Ja existe uma verificacao Didit em andamento.",
    });
  }

  try {
    const requestedIntentId = randomUUID();
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`didit-professional:${session.user.id}`}))`;
      const lockedUser = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          kycSessionId: true,
          professional: { select: { id: true, kycProvider: true, kycSessionId: true, kycStatus: true, verificationUrl: true } },
        },
      });

      const lockedProfessional = lockedUser?.professional;
      if (!lockedProfessional) throw new Error("professional_draft_not_found");
      const lockedDiditSessionId = lockedProfessional.kycProvider === "DIDIT"
        ? lockedProfessional.kycSessionId ?? lockedUser.kycSessionId
        : null;
      if (lockedDiditSessionId && lockedProfessional.kycStatus !== DIDIT_REJECTED_STATUS) {
        return {
          kind: "reused" as const,
          sessionId: lockedDiditSessionId,
          status: DIDIT_PENDING_STATUS,
          url: isSafeDigitVerificationUrl(lockedProfessional.verificationUrl) ? lockedProfessional.verificationUrl : null,
        };
      }

      const previousIntent = parseDigitIntentMarker(lockedProfessional.verificationUrl);
      if (previousIntent && Date.now() - previousIntent.leaseAt < DIGIT_INTENT_LEASE_MS) {
        return { kind: "starting" as const };
      }

      const previousIntentExpired = Boolean(
        previousIntent && Date.now() - previousIntent.createdAt >= DIGIT_INTENT_EXPIRATION_MS,
      );
      const intentId = previousIntent && !previousIntentExpired ? previousIntent.intentId : requestedIntentId;
      const marker = createDigitIntentMarker(
        intentId,
        previousIntent && !previousIntentExpired ? previousIntent.createdAt : Date.now(),
        Date.now(),
      );
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          clientStatus: "PENDING_REVIEW",
          kycSessionId: null,
          kycSubmittedAt: new Date(),
          kycReviewedAt: null,
          kycRejectionReason: null,
        },
        select: { id: true },
      });
      await tx.professional.update({
        where: { userId: session.user.id },
        data: {
          kycProvider: "DIDIT",
          kycSessionId: null,
          kycStatus: DIDIT_PENDING_STATUS,
          verifStatus: "PENDING",
          docStatus: "PENDING",
          rejectReason: null,
          verificationUrl: marker,
        },
      });
      return {
        kind: "reserved" as const,
        marker,
        vendorData: buildDigitVendorData(session.user.id, intentId),
        reconcile: Boolean(previousIntent && !previousIntentExpired),
      };
    }, { maxWait: 5_000, timeout: 10_000 });

    if (reservation.kind === "reused") {
      return NextResponse.json({
        provider: "DIDIT",
        ...reservation,
        reused: true,
        message: "Ja existe uma verificacao Didit em andamento.",
      });
    }
    if (reservation.kind === "starting") {
      return NextResponse.json(
        { error: "A verificacao esta sendo preparada. Tente novamente em instantes.", code: "DIDIT_STARTING" },
        { status: 409 },
      );
    }

    let diditSession = reservation.reconcile
      ? await findDigitSessionByVendorData(reservation.vendorData)
      : null;
    if (reservation.reconcile && !diditSession) {
      throw new Error("didit_reconciliation_pending");
    }
    if (diditSession && !diditSession.url) {
      throw new Error("didit_reconciliation_url_unavailable");
    }
    if (!diditSession) {
      const callbackSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
      const callbackState = createDigitCallbackState(callbackSecret);
      const callbackUrl = `${appBaseUrl()}/verificacao/callback?state=${encodeURIComponent(callbackState)}`;
      diditSession = await createDigitSession(reservation.vendorData, callbackUrl);
    }
    if (
      !digitVendorDataBelongsToUser(diditSession.vendor_data, session.user.id) ||
      !isSafeDigitVerificationUrl(diditSession.url)
    ) {
      throw new Error("didit_session_response_invalid");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.professional.updateMany({
        where: { userId: session.user.id, verificationUrl: reservation.marker },
        data: {
          kycProvider: "DIDIT",
          kycSessionId: diditSession.session_id,
          kycStatus: DIDIT_PENDING_STATUS,
          verifStatus: "PENDING",
          docStatus: "PENDING",
          rejectReason: null,
          verificationUrl: diditSession.url,
        },
      });
      if (updated.count !== 1) throw new Error("didit_intent_changed");
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          clientStatus: "PENDING_REVIEW",
          kycSessionId: diditSession.session_id,
          kycSubmittedAt: new Date(),
          kycReviewedAt: null,
          kycRejectionReason: null,
        },
        select: { id: true },
      });
    });

    const result = {
      sessionId: diditSession.session_id,
      status: DIDIT_PENDING_STATUS,
      reused: reservation.reconcile,
      url: diditSession.url,
    };

    return NextResponse.json({
      provider: "DIDIT",
      ...result,
      message: result.reused ? "Ja existe uma verificacao Didit em andamento." : "Verificacao de identidade Didit iniciada.",
    });
  } catch (error) {
    console.error("[Didit] Falha ao criar ou salvar sessao.", {
      userId: session.user.id,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a verificacao de identidade. Tente novamente." },
      { status: 502 },
    );
  }
}
