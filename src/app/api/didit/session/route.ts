import { monitorRegistration, registrationIdentity } from "@/lib/registration-monitor";
import { normalizeBrazilianPhone } from "@/lib/phone-otp";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import {
  buildDigitVendorData,
  createDigitSession,
  createDigitIntentMarker,
  digitVendorDataBelongsToUser,
  digitStatusWhenProviderUnavailable,
  DIDIT_APPROVED_STATUS,
  DIDIT_PENDING_STATUS,
  DIDIT_REJECTED_STATUS,
  findDigitSessionByVendorData,
  isSafeDigitVerificationUrl,
  isDigitAvailable,
  parseDigitIntentMarker,
  isDigitIntentInFlight,
} from "@/lib/didit";
import { reconcileProfessionalDidit } from "@/lib/didit-reconciliation";
import { prisma } from "@/lib/prisma";
import { createDigitCallbackState } from "@/lib/didit-callback";
import { professionalCompletion } from "@/lib/professional-completeness";
import { enforceRateLimitAsync } from "@/lib/security";

const DIGIT_INTENT_LEASE_MS = 2 * 60_000;
const DIGIT_INTENT_EXPIRATION_MS = 24 * 60 * 60_000;

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
    const starting = professional?.kycProvider === "DIDIT" && isDigitIntentInFlight(professional.verificationUrl);
    return {
      sessionId: null,
      submissionEligible: false,
      status: starting ? DIDIT_PENDING_STATUS : "NOT_STARTED" as const,
      rawStatus: null,
      retryAllowed: !starting,
      message: starting ? "A verificacao esta sendo preparada. Tente novamente em instantes." : null,
      url: null,
      starting,
    };
  }

  try {
    return await reconcileProfessionalDidit(userId, sessionId);
  } catch (error) {
    console.warn("[Didit] Nao foi possivel atualizar o status da sessao.", {
      userId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return {
      sessionId,
      status: professional?.kycStatus === DIDIT_APPROVED_STATUS ? DIDIT_APPROVED_STATUS : digitStatusWhenProviderUnavailable(),
      submissionEligible: professional?.kycStatus === DIDIT_APPROVED_STATUS,
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

  const limited = await enforceRateLimitAsync(
    `kyc-read:didit:${session.user.id}`, 20, 5 * 60_000,
    "Aguarde antes de consultar novamente a verificação.",
  );
  if (limited) return limited;

  const verification = isDigitAvailable()
    ? await currentStatus(session.user.id)
    : { sessionId: null, status: "NOT_STARTED" as const, rawStatus: null, retryAllowed: false, message: null, submissionEligible: false };

  return NextResponse.json({
    available: isDigitAvailable(),
    provider: "DIDIT",
    ...verification,
  });
}

export const POST = monitorRegistration("IDENTITY", async (_req, trace) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const limited = await enforceRateLimitAsync(`kyc-session:didit:${session.user.id}`, 3, 60 * 60 * 1000, "Muitas tentativas de iniciar verificação.");
  if (limited) return limited;
  if (!canUseProfessionalKyc(session)) {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar verificacao." }, { status: 403 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneVerified: true, phone: true },
  });
  trace.accountType = "model";
  trace.provider = "DIDIT";
  if (account?.phoneVerified && account.phone) {
    trace.identity = registrationIdentity("phone", normalizeBrazilianPhone(account.phone));
  }
  if (!account?.phoneVerified) {
    return NextResponse.json(
      { error: "Confirme seu telefone por SMS antes da verificacao de identidade.", code: "PHONE_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  const draft = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    include: { photos: { select: { url: true, cover: true } }, specialties: { select: { name: true } } },
  });
  if (!draft) return NextResponse.json({ error: "Rascunho profissional não encontrado." }, { status: 409 });
  const beforeIdentity = professionalCompletion({ ...draft, specialties: draft.specialties, emailVerified: true })
    .profileIssues.filter((issue) => ["displayName", "escortCategory"].includes(issue.field));
  if (beforeIdentity.length) {
    return NextResponse.json({
      error: "Complete as etapas anteriores antes da verificação de identidade.",
      code: "PROFILE_INCOMPLETE",
      firstIncompleteStep: Math.min(...beforeIdentity.map((issue) => issue.step)),
      issues: beforeIdentity,
    }, { status: 422 });
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
  if (existing.sessionId && existing.status === DIDIT_REJECTED_STATUS && !existing.retryAllowed) {
    return NextResponse.json({ error: existing.message, code: "DIDIT_SUPPORT_REQUIRED" }, { status: 409 });
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
      const intentId = previousIntent?.intentId ?? requestedIntentId;
      const createdAfter = previousIntent?.createdAt ?? Date.now();
      const marker = createDigitIntentMarker(intentId, createdAfter, Date.now());
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
        vendorData: buildDigitVendorData(session.user.id),
        createdAfter,
        intentId,
        expired: previousIntentExpired,
        reconcile: Boolean(previousIntent),
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
      ? await findDigitSessionByVendorData(reservation.vendorData, reservation.createdAfter)
      : null;
    const recovered = Boolean(diditSession);
    let activeMarker = reservation.marker;
    if (!diditSession) {
      const callbackSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
      let intentId = reservation.intentId;
      let createdAt = reservation.createdAfter;
      if (reservation.expired) {
        // Only rotate after a successful lookup confirmed no matching remote session.
        intentId = requestedIntentId;
        createdAt = Date.now();
        activeMarker = createDigitIntentMarker(intentId, createdAt);
        const rotated = await prisma.professional.updateMany({
          where: { userId: session.user.id, verificationUrl: reservation.marker },
          data: { verificationUrl: activeMarker },
        });
        if (rotated.count !== 1) throw new Error("didit_intent_changed");
      }
      const callbackState = createDigitCallbackState(callbackSecret, createdAt);
      const callbackUrl = `${appBaseUrl()}/verificacao/callback?state=${encodeURIComponent(callbackState)}`;
      diditSession = await createDigitSession(reservation.vendorData, callbackUrl, intentId);
    }
    if (!diditSession.session_id || !digitVendorDataBelongsToUser(diditSession.vendor_data, session.user.id)
      || (!recovered && !isSafeDigitVerificationUrl(diditSession.url))) {
      throw new Error("didit_session_response_invalid");
    }
    const verificationUrl = isSafeDigitVerificationUrl(diditSession.url) ? diditSession.url : null;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.professional.updateMany({
        where: { userId: session.user.id, verificationUrl: activeMarker },
        data: {
          kycProvider: "DIDIT",
          kycSessionId: diditSession.session_id,
          kycStatus: DIDIT_PENDING_STATUS,
          verifStatus: "PENDING",
          docStatus: "PENDING",
          rejectReason: null,
          verificationUrl,
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

    trace.outcome = "IDENTITY_PENDING";
    const result = {
      sessionId: diditSession.session_id,
      status: DIDIT_PENDING_STATUS,
      submissionEligible: false,
      reused: recovered,
      url: verificationUrl,
    };

    return NextResponse.json({
      provider: "DIDIT",
      ...result,
      message: result.reused ? "Ja existe uma verificacao Didit em andamento." : "Verificacao de identidade Didit iniciada.",
    });
  } catch (error) {
    trace.reason = "IDENTITY_SESSION_FAILED";
    console.error("[Didit] Falha ao criar ou salvar sessao.", {
      userId: session.user.id,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a verificacao de identidade. Tente novamente." },
      { status: 503, headers: { "Retry-After": String(DIGIT_INTENT_LEASE_MS / 1000) } },
    );
  }
});
