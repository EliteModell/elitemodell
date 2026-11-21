import { identityEnabled, MANUAL_DOCUMENT_PROVIDER } from "@/lib/manual-identity-policy";
import { monitorRegistration, registrationIdentity } from "@/lib/registration-monitor";
import { normalizeBrazilianPhone } from "@/lib/phone-otp";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash, randomUUID } from "crypto";
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
  isResumableDigitStatus,
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

function diditLeaseSeconds(leaseAt: number) {
  return Math.max(1, Math.ceil((leaseAt + DIGIT_INTENT_LEASE_MS - Date.now()) / 1000));
}

function diditStartingResponse(leaseAt: number) {
  return NextResponse.json(
    { code: "DIDIT_STARTING" },
    { status: 409, headers: { "Retry-After": String(diditLeaseSeconds(leaseAt)) } },
  );
}

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
  const correlationId = randomUUID();
  const requestStarted = performance.now();
  let stage = "validate";
  let providerStatus: number | null = null;
  let providerError: string | null = null;
  let sessionFingerprint: string | null = null;
  const observe: NonNullable<Parameters<typeof createDigitSession>[3]> = (observation) => {
    providerStatus = observation.httpStatus;
    providerError = observation.error;
    console.info("[Didit] provider_request", { correlationId, ...observation });
  };
  const finish = (response: NextResponse, state: string, sessionSaved = false, urlReturned = false) => {
    response.headers.set("X-Correlation-Id", correlationId);
    response.headers.set("Cache-Control", "no-store");
    console.info("[Didit] session_request_finished", {
      correlationId, state, stage, sessionSaved, urlReturned, sessionFingerprint, httpStatus: response.status,
      durationMs: Math.round(performance.now() - requestStarted),
    });
    return response;
  };
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  if (!canUseProfessionalKyc(session)) {
    return NextResponse.json({ error: "Apenas anunciantes podem iniciar verificacao." }, { status: 403 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneVerified: true, phone: true, kycSessionId: true },
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
  if (draft.kycProvider === MANUAL_DOCUMENT_PROVIDER || (identityEnabled() && !draft.kycSessionId && !account.kycSessionId && !parseDigitIntentMarker(draft.verificationUrl))) {
    return NextResponse.json({ code: "MANUAL_DOCUMENT_REQUIRED" }, { status: 409 });
  }
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

  const callbackSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!isDigitAvailable() || !callbackSecret) {
    return finish(NextResponse.json(
      { error: "Verificacao Didit nao configurada.", code: "DIDIT_UNAVAILABLE", available: false },
      { status: 503 },
    ), "configuration_missing");
  }

  if (draft.kycProvider === "DIDIT" && (draft.kycSessionId || account.kycSessionId)) {
    const limited = await enforceRateLimitAsync(`kyc-read:didit:${session.user.id}`, 20, 5 * 60_000);
    if (limited) return limited;
  }
  const existing = await currentStatus(session.user.id);
  if (existing.starting) {
    const intent = parseDigitIntentMarker(draft.verificationUrl);
    if (intent && Date.now() - intent.leaseAt < DIGIT_INTENT_LEASE_MS) {
      trace.skip = true;
      return finish(diditStartingResponse(intent.leaseAt), "lease_active");
    }
  }
  if (existing.sessionId && existing.status === DIDIT_REJECTED_STATUS && !existing.retryAllowed) {
    return NextResponse.json({ error: existing.message, code: "DIDIT_SUPPORT_REQUIRED" }, { status: 409 });
  }
  if (existing.sessionId && existing.status !== DIDIT_REJECTED_STATUS) {
    sessionFingerprint = createHash("sha256").update(existing.sessionId).digest("hex").slice(0, 12);
    trace.skip = true;
    if (!existing.url && !existing.submissionEligible) {
      return finish(NextResponse.json({ code: "DIDIT_LINK_UNAVAILABLE" }, { status: 503 }), "existing_link_unavailable", true);
    }
    return finish(NextResponse.json({
      provider: "DIDIT",
      ...existing,
      reused: true,
      url: existing.url,
      message: existing.status === DIDIT_APPROVED_STATUS
        ? "Identidade verificada."
        : "Ja existe uma verificacao Didit em andamento.",
    }, { status: existing.url ? 200 : 202 }), existing.url ? "session_reused" : "already_submitted", true, Boolean(existing.url));
  }

  if (identityEnabled()) return NextResponse.json({ code: "MANUAL_DOCUMENT_REQUIRED" }, { status: 409 });

  let leaseAt: number | undefined;
  try {
    stage = "reserve";
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
        return { kind: "starting" as const, leaseAt: previousIntent.leaseAt };
      }
      if (!previousIntent) {
        const limited = await enforceRateLimitAsync(`kyc-session:didit:${session.user.id}`, 3, 60 * 60 * 1000);
        if (limited) return { kind: "limited" as const, response: limited };
      }

      const previousIntentExpired = Boolean(
        previousIntent && Date.now() - previousIntent.createdAt >= DIGIT_INTENT_EXPIRATION_MS,
      );
      const intentId = previousIntent?.intentId ?? requestedIntentId;
      const createdAfter = previousIntent?.createdAt ?? Date.now();
      const reservedAt = Date.now();
      const marker = createDigitIntentMarker(intentId, createdAfter, reservedAt);
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
        reservedAt,
        vendorData: buildDigitVendorData(session.user.id),
        createdAfter,
        intentId,
        expired: previousIntentExpired,
        reconcile: Boolean(previousIntent),
      };
    }, { maxWait: 5_000, timeout: 10_000 });

    if (reservation.kind === "reused") {
      sessionFingerprint = createHash("sha256").update(reservation.sessionId).digest("hex").slice(0, 12);
      trace.skip = true;
      if (!reservation.url) {
        return finish(NextResponse.json({ code: "DIDIT_LINK_UNAVAILABLE" }, { status: 503 }), "concurrent_link_unavailable", true);
      }
      return finish(NextResponse.json({
        provider: "DIDIT",
        ...reservation,
        reused: true,
        message: "Ja existe uma verificacao Didit em andamento.",
      }), "session_reused", true, true);
    }
    if (reservation.kind === "starting") {
      trace.skip = true;
      return finish(diditStartingResponse(reservation.leaseAt), "lease_active");
    }
    if (reservation.kind === "limited") return reservation.response;
    leaseAt = reservation.reservedAt;

    stage = "lookup";
    let diditSession = reservation.reconcile
      ? await findDigitSessionByVendorData(reservation.vendorData, reservation.createdAfter, observe)
      : null;
    const recovered = Boolean(diditSession);
    let activeMarker = reservation.marker;
    if (!diditSession) {
      let intentId = reservation.intentId;
      let createdAt = reservation.createdAfter;
      if (reservation.expired) {
        // Only rotate after a successful lookup confirmed no matching remote session.
        const limited = await enforceRateLimitAsync(`kyc-session:didit:${session.user.id}`, 3, 60 * 60 * 1000);
        if (limited) return limited;
        intentId = requestedIntentId;
        createdAt = Date.now();
        activeMarker = createDigitIntentMarker(intentId, createdAt);
        const rotated = await prisma.professional.updateMany({
          where: { userId: session.user.id, verificationUrl: reservation.marker },
          data: { verificationUrl: activeMarker },
        });
        if (rotated.count !== 1) throw new Error("didit_intent_changed");
        leaseAt = createdAt;
      }
      stage = "callback";
      const callbackState = createDigitCallbackState(callbackSecret, createdAt);
      const callbackUrl = `${appBaseUrl()}/verificacao/callback?state=${encodeURIComponent(callbackState)}`;
      stage = "create";
      diditSession = await createDigitSession(reservation.vendorData, callbackUrl, intentId, observe);
    }
    stage = "validate_provider_response";
    if (typeof diditSession.session_id !== "string" || !diditSession.session_id || !digitVendorDataBelongsToUser(diditSession.vendor_data, session.user.id)) {
      throw new Error("didit_session_response_invalid");
    }
    sessionFingerprint = createHash("sha256").update(diditSession.session_id).digest("hex").slice(0, 12);
    const verificationUrl = isSafeDigitVerificationUrl(diditSession.url) && isResumableDigitStatus(diditSession.status) ? diditSession.url : null;

    stage = "persist";
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

    if (!verificationUrl) {
      trace.reason = "DIDIT_LINK_UNAVAILABLE";
      return finish(NextResponse.json({ code: "DIDIT_LINK_UNAVAILABLE" }, { status: 503 }), "recovered_link_missing", true);
    }

    trace.outcome = "IDENTITY_PENDING";
    const result = {
      sessionId: diditSession.session_id,
      status: DIDIT_PENDING_STATUS,
      submissionEligible: false,
      reused: recovered,
      url: verificationUrl,
    };

    return finish(NextResponse.json({
      provider: "DIDIT",
      ...result,
      message: result.reused ? "Ja existe uma verificacao Didit em andamento." : "Verificacao de identidade Didit iniciada.",
    }), recovered ? "session_recovered" : "session_created", true, true);
  } catch (error) {
    trace.reason = "IDENTITY_SESSION_FAILED";
    trace.providerCode = providerStatus ?? undefined;
    console.error("[Didit] session_request_failed", {
      correlationId, stage, providerStatus, providerError,
      errorKind: error instanceof SyntaxError ? "invalid_json" : error instanceof Error && /^didit_[a-z_]+$/.test(error.message) ? error.message : "operation_failed",
    });
    return finish(NextResponse.json(
      { error: "Nao foi possivel iniciar a verificacao de identidade. Tente novamente." },
      { status: 503, headers: leaseAt === undefined ? undefined : { "Retry-After": String(diditLeaseSeconds(leaseAt)) } },
    ), "failed");
  }
});
