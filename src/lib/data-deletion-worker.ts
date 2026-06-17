import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const STEP_KEYS = [
  "inventory",
  "account_lock",
  "external_accounts",
  "storage_and_media",
  "operational_data",
  "profiles_and_listings",
  "financial_and_legal_retention",
  "identity_anonymization",
  "receipt",
] as const;

type StepKey = typeof STEP_KEYS[number];

export const DATA_DELETION_STEP_KEYS = STEP_KEYS;

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function backoffDate(attempt: number) {
  const minutes = Math.min(24 * 60, 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + minutes * 60 * 1000);
}

function anonymizedEmail(userId: string) {
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  return `deleted+${hash}@deleted.invalid`;
}

function parseSupabaseStorageUrl(value: string | null | undefined) {
  if (!value) return null;
  const expected = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!expected) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(expected).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

async function buildTargetIds(userId: string) {
  const [professional, properties] = await Promise.all([
    prisma.professional.findUnique({ where: { userId }, select: { id: true } }),
    prisma.property.findMany({ where: { hostId: userId }, select: { id: true } }),
  ]);
  return [
    userId,
    ...(professional ? [professional.id] : []),
    ...properties.map((property) => property.id),
  ];
}

export async function buildDeletionPlan(userId: string) {
  const targetIds = await buildTargetIds(userId);
  const [
    user,
    accounts,
    sessions,
    phoneTokens,
    uploads,
    stories,
    professional,
    properties,
    favorites,
    notifications,
    messages,
    bookings,
    payments,
    appointments,
    reviews,
    professionalReviews,
    reports,
    acceptances,
    checkoutAcceptances,
    contentDeclarations,
    preferences,
    legalEvidence,
    retentionRules,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, blocked: true, createdAt: true },
    }),
    prisma.account.count({ where: { userId } }),
    prisma.session.count({ where: { userId } }),
    prisma.phoneVerificationCode.count({ where: { userId } }),
    prisma.uploadAsset.count({ where: { userId } }),
    prisma.story.count({ where: { userId } }),
    prisma.professional.findUnique({
      where: { userId },
      select: { id: true, photos: { select: { id: true } } },
    }),
    prisma.property.findMany({
      where: { hostId: userId },
      select: { id: true, photos: { select: { id: true } }, bookings: { select: { id: true } } },
    }),
    prisma.favorite.count({ where: { userId } }),
    prisma.notification.count({ where: { userId } }),
    prisma.message.count({ where: { senderId: userId } }),
    prisma.booking.count({ where: { guestId: userId } }),
    prisma.payment.count({ where: { userId } }),
    prisma.appointment.count({ where: { clientId: userId } }),
    prisma.review.count({ where: { authorId: userId } }),
    prisma.professionalReview.count({ where: { authorId: userId } }),
    prisma.report.count({ where: { authorId: userId } }),
    prisma.userAcceptance.count({ where: { userId } }),
    prisma.checkoutAcceptance.count({ where: { userId } }),
    prisma.contentDeclaration.count({ where: { userId } }),
    prisma.consentPreference.count({ where: { userId } }),
    prisma.evidenceArtifact.findMany({
      where: {
        legalHold: true,
        case: { targetId: { in: targetIds } },
      },
      select: { id: true, bucket: true, storagePath: true, expiresAt: true },
    }),
    prisma.dataRetentionRule.findMany({
      where: { status: "APPROVED" },
      select: { category: true, action: true, retentionDays: true, legalBasis: true },
    }),
  ]);
  if (!user) throw new Error("Usuario nao encontrado.");

  return {
    generatedAt: new Date().toISOString(),
    subject: { id: user.id, createdAt: user.createdAt, alreadyBlocked: user.blocked },
    remove: {
      accounts,
      sessions,
      phoneTokens,
      uploads,
      stories,
      professionalPhotos: professional?.photos.length ?? 0,
      propertyPhotos: properties.reduce((total, property) => total + property.photos.length, 0),
      favorites,
      notifications,
      sentMessages: messages,
      consentPreferences: preferences,
    },
    anonymize: {
      user: 1,
      professional: professional ? 1 : 0,
      hostProfile: 1,
      properties: properties.length,
      appointments,
      reviews,
      professionalReviews,
    },
    preserve: {
      payments,
      bookings,
      propertyBookings: properties.reduce((total, property) => total + property.bookings.length, 0),
      reports,
      legalAcceptances: acceptances,
      checkoutAcceptances,
      contentDeclarations,
      privacyProtocol: 1,
      legalEvidence,
      retentionRules,
    },
  };
}

async function runStep(
  jobId: string,
  itemKey: StepKey,
  operation: () => Promise<unknown>,
) {
  const existing = await prisma.dataDeletionJobItem.findUnique({
    where: { jobId_itemKey: { jobId, itemKey } },
  });
  if (existing?.status === "COMPLETED" || existing?.status === "PRESERVED") {
    return existing.details;
  }

  const item = await prisma.dataDeletionJobItem.upsert({
    where: { jobId_itemKey: { jobId, itemKey } },
    create: {
      jobId,
      itemKey,
      status: "PROCESSING",
      attempts: 1,
      startedAt: new Date(),
    },
    update: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      startedAt: new Date(),
      error: null,
      nextAttemptAt: null,
    },
  });
  try {
    const result = await operation();
    await prisma.dataDeletionJobItem.update({
      where: { id: item.id },
      data: {
        status: "COMPLETED",
        details: json(result),
        completedAt: new Date(),
        error: null,
        nextAttemptAt: null,
      },
    });
    return result;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha desconhecida.";
    await prisma.dataDeletionJobItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: message,
        nextAttemptAt: backoffDate(item.attempts),
      },
    });
    throw cause;
  }
}

async function revokeExternalAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
    },
  });
  const results: Array<Record<string, unknown>> = [];

  for (const account of accounts) {
    if (account.provider === "google" && (account.access_token || account.refresh_token)) {
      const token = account.access_token || account.refresh_token;
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: token! }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!response.ok && response.status !== 400) {
        throw new Error(`Google OAuth revoke respondeu HTTP ${response.status}.`);
      }
      results.push({ provider: "google", revoked: true, status: response.status });
    } else if (account.provider === "supabase") {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.admin.deleteUser(account.providerAccountId);
      if (error && !/not found/i.test(error.message)) {
        throw new Error(`Supabase Auth: ${error.message}`);
      }
      results.push({ provider: "supabase", revoked: true });
    } else {
      results.push({ provider: account.provider, revoked: false, reason: "Sem adaptador externo; credencial local removida." });
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const [deletedAccounts, deletedSessions, deletedTokens, deletedPhoneCodes] = await prisma.$transaction([
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.verificationToken.deleteMany({ where: user?.email ? { identifier: user.email } : { identifier: "" } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId } }),
    prisma.adminMfaSession.deleteMany({ where: { userId } }),
    prisma.adminMfaEnrollment.deleteMany({ where: { userId } }),
  ]);
  return {
    providers: results,
    deleted: {
      accounts: deletedAccounts.count,
      sessions: deletedSessions.count,
      verificationTokens: deletedTokens.count,
      phoneCodes: deletedPhoneCodes.count,
    },
  };
}

async function collectLegacyMedia(userId: string) {
  const [user, professional, properties, stories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { image: true } }),
    prisma.professional.findUnique({
      where: { userId },
      select: {
        image: true,
        galleryUrls: true,
        presentationVideoUrl: true,
        docFrenteUrl: true,
        docVersoUrl: true,
        verificationUrl: true,
        photos: { select: { url: true } },
      },
    }),
    prisma.property.findMany({
      where: { hostId: userId },
      select: { photos: { select: { url: true } } },
    }),
    prisma.story.findMany({
      where: { userId },
      select: { mediaUrl: true, thumbnail: true },
    }),
  ]);
  const values = [
    user?.image,
    professional?.image,
    professional?.presentationVideoUrl,
    professional?.docFrenteUrl,
    professional?.docVersoUrl,
    professional?.verificationUrl,
    ...(professional?.galleryUrls ?? []),
    ...(professional?.photos.map((photo) => photo.url) ?? []),
    ...properties.flatMap((property) => property.photos.map((photo) => photo.url)),
    ...stories.flatMap((story) => [story.mediaUrl, story.thumbnail]),
  ];
  return values
    .map(parseSupabaseStorageUrl)
    .filter((entry): entry is { bucket: string; path: string } => Boolean(entry));
}

async function removeStorageAndMedia(userId: string, preservation: ReturnType<typeof buildDeletionPlan> extends Promise<infer T> ? T : never) {
  const supabase = createSupabaseServerClient();
  const assets = await prisma.uploadAsset.findMany({ where: { userId } });
  const protectedPaths = new Set(
    preservation.preserve.legalEvidence.map((item) => `${item.bucket}:${item.storagePath}`),
  );
  let removedObjects = 0;
  let preservedObjects = 0;

  for (const asset of assets) {
    const locations = [
      { bucket: asset.quarantineBucket, path: asset.quarantinePath },
      ...(asset.approvedBucket && asset.approvedPath
        ? [{ bucket: asset.approvedBucket, path: asset.approvedPath }]
        : []),
    ];
    for (const location of locations) {
      if (protectedPaths.has(`${location.bucket}:${location.path}`)) {
        preservedObjects += 1;
        continue;
      }
      const { error } = await supabase.storage.from(location.bucket).remove([location.path]);
      if (error && !/not found/i.test(error.message)) throw new Error(error.message);
      removedObjects += 1;
    }
  }

  for (const location of await collectLegacyMedia(userId)) {
    if (protectedPaths.has(`${location.bucket}:${location.path}`)) {
      preservedObjects += 1;
      continue;
    }
    const { error } = await supabase.storage.from(location.bucket).remove([location.path]);
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    removedObjects += 1;
  }

  const professional = await prisma.professional.findUnique({ where: { userId }, select: { id: true } });
  const properties = await prisma.property.findMany({ where: { hostId: userId }, select: { id: true } });
  await prisma.$transaction([
    prisma.story.deleteMany({ where: { userId } }),
    prisma.uploadAsset.deleteMany({
      where: {
        userId,
        id: {
          notIn: assets
            .filter((asset) =>
              protectedPaths.has(`${asset.quarantineBucket}:${asset.quarantinePath}`) ||
              Boolean(asset.approvedBucket && asset.approvedPath && protectedPaths.has(`${asset.approvedBucket}:${asset.approvedPath}`)),
            )
            .map((asset) => asset.id),
        },
      },
    }),
    prisma.professionalPhoto.deleteMany({ where: professional ? { professionalId: professional.id } : { professionalId: "" } }),
    prisma.propertyPhoto.deleteMany({ where: { propertyId: { in: properties.map((property) => property.id) } } }),
  ]);
  return { removedObjects, preservedObjects, uploadRecords: assets.length };
}

async function removeOperationalData(userId: string) {
  const [
    favorites,
    notifications,
    messages,
    preferences,
    voucherSpins,
    vouchers,
  ] = await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.message.deleteMany({ where: { senderId: userId } }),
    prisma.consentPreference.deleteMany({ where: { userId } }),
    prisma.voucherSpin.updateMany({ where: { clientId: userId }, data: { clientId: null } }),
    prisma.clientVoucher.updateMany({ where: { clientId: userId }, data: { clientId: null } }),
  ]);
  return {
    favorites: favorites.count,
    notifications: notifications.count,
    messages: messages.count,
    consentPreferences: preferences.count,
    voucherSpinsDetached: voucherSpins.count,
    vouchersDetached: vouchers.count,
  };
}

async function anonymizeProfilesAndListings(userId: string) {
  const professional = await prisma.professional.findUnique({ where: { userId }, select: { id: true } });
  const properties = await prisma.property.findMany({ where: { hostId: userId }, select: { id: true } });
  const propertyIds = properties.map((property) => property.id);
  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.hostProfile.updateMany({
      where: { userId },
      data: {
        bio: null,
        bankName: null,
        bankAgency: null,
        bankAccount: null,
        bankPix: null,
      },
    }),
    prisma.property.updateMany({
      where: { hostId: userId },
      data: {
        title: "Anuncio removido",
        description: "Conteudo removido por solicitacao do titular.",
        status: "INACTIVE",
        address: "Dados removidos",
        bairro: null,
        city: "Dados removidos",
        state: "NA",
        zipCode: null,
        latitude: null,
        longitude: null,
      },
    }),
    prisma.propertyAmenity.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.blockedDate.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.seasonalPrice.deleteMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.appointment.updateMany({ where: { clientId: userId }, data: { notes: null } }),
    prisma.review.updateMany({
      where: { authorId: userId },
      data: { comment: "Conteudo removido por solicitacao do titular.", response: null },
    }),
    prisma.professionalReview.updateMany({
      where: { authorId: userId },
      data: { comment: "Conteudo removido por solicitacao do titular.", response: null, hidden: true },
    }),
  ];
  if (professional) {
    operations.push(
      prisma.professional.update({
        where: { id: professional.id },
        data: {
          displayName: "Perfil removido",
          bio: "Conteudo removido por solicitacao do titular.",
          city: "Dados removidos",
          state: "NA",
          bairro: null,
          phone: null,
          whatsapp: null,
          instagram: null,
          website: null,
          image: null,
          galleryUrls: [],
          presentationVideoUrl: null,
          presentationVideoStatus: "NONE",
          presentationVideoRejectReason: null,
          docType: null,
          docFrenteUrl: null,
          docVersoUrl: null,
          docStatus: "NOT_SENT",
          verifStatus: "NOT_SENT",
          verificationUrl: null,
          verificationType: null,
          verificationCode: null,
          kycProvider: null,
          kycSessionId: null,
          kycStatus: "NOT_STARTED",
          status: "SUSPENDED",
          verified: false,
          featured: false,
          boostActive: false,
          pauseReason: "Conta excluida pelo titular.",
        },
      }),
      prisma.professionalSpecialty.deleteMany({ where: { professionalId: professional.id } }),
      prisma.schedule.deleteMany({ where: { professionalId: professional.id } }),
      prisma.professionalVoucherSettings.deleteMany({ where: { professionalId: professional.id } }),
    );
  }
  await prisma.$transaction(operations);
  return {
    professionalAnonymized: Boolean(professional),
    propertiesAnonymized: propertyIds.length,
  };
}

async function recordRetention(userId: string, plan: Awaited<ReturnType<typeof buildDeletionPlan>>) {
  const preservation = {
    retainedAt: new Date().toISOString(),
    reason: "Obrigacoes financeiras, defesa de direitos, trilhas de aceite e evidencias.",
    counts: plan.preserve,
    access: "Restrito a perfis administrativos autorizados e finalidades legais.",
  };
  await prisma.$transaction([
    prisma.checkoutAcceptance.updateMany({
      where: { userId },
      data: { status: "PRESERVED_AFTER_DELETION" },
    }),
    prisma.consentPreference.deleteMany({ where: { userId } }),
    prisma.legalDocumentVersion.updateMany({
      where: { OR: [{ authorId: userId }, { approverId: userId }] },
      data: { authorId: null, approverId: null },
    }),
    prisma.adminRoleAssignment.updateMany({
      where: { userId, active: true },
      data: { active: false, revokedAt: new Date(), reason: "Conta excluida pelo titular." },
    }),
  ]);
  return preservation;
}

async function anonymizeIdentity(userId: string) {
  const now = new Date();
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Conta excluida",
      email: anonymizedEmail(userId),
      emailVerified: null,
      password: null,
      image: null,
      phone: null,
      phoneVerified: false,
      phoneVerifiedAt: null,
      city: null,
      state: null,
      accountType: "deleted",
      document: null,
      birthDate: null,
      category: null,
      verified: false,
      credits: 0,
      premiumUntil: null,
      blocked: true,
      blockReason: "Conta excluida e pseudonimizada por solicitacao LGPD.",
      blockedAt: now,
      lgpdConsent: false,
      termsConsent: false,
      consentDate: null,
      clientStatus: "REJECTED",
      kycSessionId: null,
      kycSubmittedAt: null,
      kycReviewedAt: null,
      kycRejectionReason: null,
      kycIsSandbox: null,
      kycChecksJson: Prisma.JsonNull,
      termsVersion: null,
    },
    select: { id: true, email: true, blocked: true },
  });
  await prisma.clientProfile.updateMany({
    where: { userId },
    data: { displayName: null, status: "REJECTED" },
  });
  return { userId: user.id, pseudonymousEmail: user.email, blocked: user.blocked };
}

export async function processDataDeletionJob(jobId: string) {
  const job = await prisma.dataDeletionJob.findUnique({
    where: { id: jobId },
    include: { items: true },
  });
  if (!job) throw new Error("Job de exclusao nao encontrado.");
  if (job.status === "COMPLETED" || job.status === "COMPLETED_WITH_PRESERVATION") return job;
  if (job.legalHold) {
    return prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: { status: "LEGAL_HOLD", errorSummary: job.legalHoldReason || "Bloqueio legal ativo." },
    });
  }

  await prisma.dataDeletionJob.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      startedAt: job.startedAt ?? new Date(),
      errorSummary: null,
      nextAttemptAt: null,
    },
  });

  try {
    const plan = await runStep(job.id, "inventory", () => buildDeletionPlan(job.userId)) as Awaited<ReturnType<typeof buildDeletionPlan>>;
    await prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: { scope: json(plan), preservation: json(plan.preserve) },
    });

    if (job.mode === "SIMULATE") {
      const receiptHash = createHash("sha256")
        .update(JSON.stringify({ jobId: job.id, mode: job.mode, plan }))
        .digest("hex");
      return prisma.dataDeletionJob.update({
        where: { id: job.id },
        data: {
          status: "SIMULATED",
          completedAt: new Date(),
          receiptHash,
          preservation: json(plan.preserve),
        },
      });
    }

    await runStep(job.id, "account_lock", async () => {
      const updated = await prisma.user.update({
        where: { id: job.userId },
        data: {
          blocked: true,
          blockedAt: new Date(),
          blockReason: "Exclusao LGPD em processamento.",
        },
        select: { id: true, blocked: true },
      });
      await prisma.session.deleteMany({ where: { userId: job.userId } });
      return updated;
    });
    await runStep(job.id, "external_accounts", () => revokeExternalAccounts(job.userId));
    await runStep(job.id, "storage_and_media", () => removeStorageAndMedia(job.userId, plan));
    await runStep(job.id, "operational_data", () => removeOperationalData(job.userId));
    await runStep(job.id, "profiles_and_listings", () => anonymizeProfilesAndListings(job.userId));
    const preservation = await runStep(
      job.id,
      "financial_and_legal_retention",
      () => recordRetention(job.userId, plan),
    );
    await runStep(job.id, "identity_anonymization", () => anonymizeIdentity(job.userId));
    const receipt = await runStep(job.id, "receipt", async () => {
      const items = await prisma.dataDeletionJobItem.findMany({
        where: { jobId: job.id },
        orderBy: { createdAt: "asc" },
        select: { itemKey: true, status: true, attempts: true, details: true },
      });
      const completedAt = new Date();
      const receiptHash = createHash("sha256")
        .update(JSON.stringify({ jobId: job.id, userId: job.userId, completedAt, items, preservation }))
        .digest("hex");
      return { receiptHash, completedAt, items };
    }) as { receiptHash: string; completedAt: string | Date; items: unknown[] };

    const completedAt = new Date(receipt.completedAt);
    const updated = await prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED_WITH_PRESERVATION",
        completedAt,
        receiptHash: receipt.receiptHash,
        preservation: json(preservation),
        errorSummary: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorIdentifier: "data-deletion-worker",
        action: "SETTINGS_CHANGED",
        targetType: "USER",
        targetId: job.userId,
        reason: "Exclusao LGPD concluida com preservacao legal controlada.",
        changes: json({
          jobId: job.id,
          privacyRequestId: job.privacyRequestId,
          receiptHash: receipt.receiptHash,
          status: updated.status,
        }),
      },
    });
    if (job.privacyRequestId) {
      await prisma.privacyRequest.update({
        where: { id: job.privacyRequestId },
        data: {
          status: "COMPLETED_WITH_PRESERVATION",
          completedAt,
          receiptHash: receipt.receiptHash,
          preservation: json(preservation),
          events: {
            create: {
              type: "DELETION_COMPLETED",
              notes: "Dados operacionais removidos; registros legalmente necessarios preservados sob acesso restrito.",
              metadata: json({ receiptHash: receipt.receiptHash }),
            },
          },
        },
      });
    }
    return updated;
  } catch (cause) {
    const current = await prisma.dataDeletionJob.findUniqueOrThrow({ where: { id: job.id } });
    const errorSummary = cause instanceof Error ? cause.message : "Falha desconhecida.";
    const exhausted = current.attempts >= current.maxAttempts;
    await prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? "FAILED" : "RETRY",
        errorSummary,
        nextAttemptAt: exhausted ? null : backoffDate(current.attempts),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorIdentifier: "data-deletion-worker",
        action: "SETTINGS_CHANGED",
        targetType: "USER",
        targetId: job.userId,
        reason: exhausted
          ? "Exclusao LGPD interrompida apos esgotar tentativas."
          : "Exclusao LGPD reagendada apos falha.",
        changes: json({
          jobId: job.id,
          attempts: current.attempts,
          maxAttempts: current.maxAttempts,
          error: errorSummary,
        }),
      },
    }).catch(() => undefined);
    throw cause;
  }
}

export async function processPendingDeletionJobs(limit = 5) {
  const now = new Date();
  const candidates = await prisma.dataDeletionJob.findMany({
    where: {
      status: { in: ["PENDING", "RETRY"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 20),
    select: { id: true, status: true },
  });
  const results = [];
  for (const candidate of candidates) {
    const claimed = await prisma.dataDeletionJob.updateMany({
      where: { id: candidate.id, status: candidate.status },
      data: { status: "PROCESSING" },
    });
    if (!claimed.count) continue;
    try {
      const result = await processDataDeletionJob(candidate.id);
      results.push({ id: candidate.id, status: result.status });
    } catch (cause) {
      results.push({
        id: candidate.id,
        status: "ERROR",
        error: cause instanceof Error ? cause.message : "Falha desconhecida.",
      });
    }
  }
  return results;
}
