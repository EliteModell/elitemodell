export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdultContentRequest } from "@/lib/adult-content-access";
import { authOptions } from "@/lib/auth";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { DIDIT_PROVIDER } from "@/lib/professional-verification";
import { ProfessionalDiditError, requireApprovedProfessionalDidit } from "@/lib/professional-didit";
import { getProfessionalBillingSettings } from "@/lib/professional-access";
import { createProfessionalSchema } from "@/lib/professional-profile-schema";
import { assertApprovedMediaUrls } from "@/lib/approved-media";
import { normalizeContactVisibility } from "@/lib/professional-contact";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
} from "@/lib/public-professional-profile";
import { professionalCityFilter, resolveExactCityQuery } from "@/lib/public-city-search";
import { publicProfessionalWhere } from "@/lib/public-professional-access";
import { publicServiceLocation } from "@/lib/professional-location";
import { normalizeControlledMediaUrl } from "@/lib/public-professional-media";
import { deliverProfessionalSubmissionReceipt } from "@/lib/professional-submission-receipt";
import { logAudit } from "@/lib/audit";
import { professionalCompletion, issueChecklist } from "@/lib/professional-completeness";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits.slice(0, 11);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimitAsync(`public-search:${getClientIP(req)}`, 300, 60 * 1000, "Muitas buscas em pouco tempo.");
  if (limited) return limited;
  const adultAccess = await authorizeAdultContentRequest(req, { allowAgeDeclaration: true });
  if (!adultAccess.ok) return NextResponse.json({ error: adultAccess.error }, { status: adultAccess.status, headers: adultAccess.headers });
  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search");
  const specialty = searchParams.get("specialty");
  const city      = searchParams.get("city");
  const state     = searchParams.get("state");
  const category  = searchParams.get("category");
  const priceMax  = searchParams.get("priceMax");
  const virtual   = searchParams.get("virtual") === "1";
  const sortBy    = searchParams.get("sortBy") ?? "rating";
  const pageParam = Number(searchParams.get("page") ?? 1);
  const page      = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limitParam = Number(searchParams.get("limit") ?? 12);
  const limit     = Number.isFinite(limitParam) ? Math.min(24, Math.max(1, Math.floor(limitParam))) : 12;
  const now       = new Date();
  const billingSettings = await getProfessionalBillingSettings();

  // Pausas vencidas voltam a aparecer pela própria consulta, sem escrita de manutenção no GET.
  const where: Prisma.ProfessionalWhereInput = {};
  const andFilters: Prisma.ProfessionalWhereInput[] = [
    publicProfessionalWhere(now, billingSettings.billingEnabled),
  ];

  if (search) {
    const exactCity = resolveExactCityQuery(search);
    if (exactCity) andFilters.push(await professionalCityFilter(exactCity.city, exactCity.state));
    else {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
      ];
    }
  }
  if (city) {
    andFilters.push(await professionalCityFilter(city, state ?? ""));
  } else if (state) {
    andFilters.push({ OR: [
      { currentServiceState: { equals: state.toUpperCase(), mode: "insensitive" } },
      { AND: [{ OR: [{ currentServiceState: null }, { currentServiceState: "" }] }, { state: { equals: state.toUpperCase(), mode: "insensitive" } }] },
    ] });
  }
  if (virtual) {
    andFilters.push({
      attendanceTypes: {
        hasSome: ["Atendimento virtual/online", "Atendimento virtual", "Online", "Video chamada", "Vídeo chamada"],
      },
    });
  }
  if (category) where.escortCategory = category.toUpperCase();
  if (priceMax) where.priceMin = { lte: Number(priceMax) };
  if (specialty) {
    andFilters.push({
      OR: [
        { specialties: { some: { name: { contains: specialty, mode: "insensitive" } } } },
        { services: { has: specialty } },
      ],
    });
  }
  if (andFilters.length > 0) where.AND = andFilters;

  const orderBy: Prisma.ProfessionalOrderByWithRelationInput[] =
    sortBy === "price_asc"  ? [{ boostActive: "desc" }, { planPriority: "desc" }, { priceMin: "asc" }] :
    sortBy === "price_desc" ? [{ boostActive: "desc" }, { planPriority: "desc" }, { priceMin: "desc" }] :
    sortBy === "reviews"    ? [{ boostActive: "desc" }, { planPriority: "desc" }, { totalReviews: "desc" }] :
    sortBy === "recent"     ? [{ boostActive: "desc" }, { planPriority: "desc" }, { createdAt: "desc" }] :
    sortBy === "online"     ? [{ boostActive: "desc" }, { planPriority: "desc" }, { lastOnlineAt: "desc" }, { rating: "desc" }] :
    [{ boostActive: "desc" }, { planPriority: "desc" }, { featured: "desc" }, { rating: "desc" }, { totalReviews: "desc" }];

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, displayName: true,
        bio: true,
        city: true, state: true, bairro: true,
        currentServiceCity: true, currentServiceState: true, currentServiceNeighborhood: true,
        image: true,
        escortCategory: true, birthDate: true,
        hideAge: true,
        phone: true,
        whatsapp: true,
        hidePhone: true,
        contactVisibility: true,
        priceMin: true, pricePerHour: true, price30min: true,
        attendanceTypes: true, servesGenders: true,
        services: true,
        rating: true, totalReviews: true,
        verified: true, featured: true,
        boostActive: true, boostUntil: true,
        activePlanId: true, planPriority: true,
        onlineVisible: true, lastOnlineAt: true,
        user: { select: { image: true, premiumUntil: true } },
        photos: { where: { hiddenAt: null }, orderBy: { order: "asc" }, take: 8, select: { id: true, url: true, cover: true, order: true } },
        specialties: { select: { id: true, name: true } },
      },
    }),
    prisma.professional.count({ where }),
  ]);

  const safeList = professionals.map(({
    hidePhone,
    contactVisibility,
    birthDate,
    hideAge,
    onlineVisible,
    lastOnlineAt,
    activePlanId,
    planPriority,
    currentServiceCity,
    currentServiceState,
    currentServiceNeighborhood,
    ...p
  }) => {
    const serviceLocation = publicServiceLocation({ ...p, currentServiceCity, currentServiceState, currentServiceNeighborhood });
    const photos = canonicalProfessionalPhotos({ photos: p.photos, image: p.image, galleryUrls: [] });
    const premiumActive = Boolean(p.user.premiumUntil && p.user.premiumUntil > now);
    const normalizedContactVisibility = normalizeContactVisibility(contactVisibility, hidePhone);
    return {
      ...p,
      city: serviceLocation.city,
      state: serviceLocation.state,
      bairro: serviceLocation.neighborhood,
      image: photos.find((photo) => photo.cover)?.url ?? photos[0]?.url ?? null,
      avatar: stripLegacyPublicStorageUrl(p.user.image),
      user: { image: stripLegacyPublicStorageUrl(p.user.image) },
      photos,
      age: hideAge ? null : calculateAge(birthDate, now),
      online: isProfessionalOnline(lastOnlineAt, onlineVisible, now),
      sponsored: p.boostActive && (!p.boostUntil || p.boostUntil > now),
      plan: premiumActive ? activePlanId : null,
      planPriority: premiumActive ? planPriority : 0,
      contactVisibility: normalizedContactVisibility,
      contactAvailable: Boolean(p.whatsapp || p.phone),
      phone: normalizedContactVisibility === "PUBLIC" ? p.phone : null,
      whatsapp: normalizedContactVisibility === "PUBLIC" ? p.whatsapp : null,
    };
  });

  return NextResponse.json(
    { professionals: safeList, total, page, pages: Math.ceil(total / limit) },
    { headers: ageGateCacheHeaders() },
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const canManageProfessional =
    session.user.role === "ADMIN" ||
    session.user.activeProfileType === "PROFESSIONAL" ||
    session.user.accountType === "model" ||
    session.user.accountType === "professional" ||
    session.user.isProfessional;

  if (!canManageProfessional) {
    return NextResponse.json({ error: "Apenas anunciantes podem criar perfil profissional." }, { status: 403 });
  }

  const existing = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true, user: { select: { email: true, name: true } } },
  });
  if (existing && !["DRAFT", "CORRECTION_REQUIRED"].includes(existing.status)) {
    if (existing.status === "PENDING_REVIEW") {
      const receiptStatus = await deliverProfessionalSubmissionReceipt(existing.id, existing.user.email);
      return NextResponse.json({
        ok: true,
        professionalId: existing.id,
        status: existing.status,
        alreadySubmitted: true,
        receiptStatus,
      });
    }
    return NextResponse.json({ error: "Você já tem um perfil profissional." }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = createProfessionalSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, category: true, email: true, emailVerified: true, clientStatus: true, kycSessionId: true },
    });

    if (!user?.emailVerified) {
      return NextResponse.json(
        {
          error: "Confirme seu e-mail antes de enviar o cadastro para análise.",
          code: "email_not_verified",
        },
        { status: 428 },
      );
    }

    const completion = professionalCompletion({ ...data, emailVerified: user.emailVerified });
    if (completion.profileIssues.length) {
      return NextResponse.json({
        error: "Seu cadastro ainda não pode ser enviado.",
        code: "profile_incomplete",
        completion,
        checklist: issueChecklist({ ...data, emailVerified: user.emailVerified }),
      }, { status: 422 });
    }

    const diditVerification = await requireApprovedProfessionalDidit(session.user.id);

    const { specialties, services, phone, whatsapp, image, galleryUrls, ...profileData } = data;
    await assertApprovedMediaUrls({
      urls: [image, ...galleryUrls].filter((url): url is string => Boolean(url)),
      requestUrl: req.url,
      ownerId: session.user.id,
      allowedFolderPrefixes: ["profiles"],
    });
    const normalizedImage = normalizeControlledMediaUrl(image);
    const normalizedGalleryUrls = galleryUrls
      .map((url) => normalizeControlledMediaUrl(url))
      .filter((url): url is string => Boolean(url));
    const escortCategory = profileData.escortCategory
      || (user?.category && ["MULHER", "TRANS", "HOMEM"].includes(user.category) ? user.category : undefined);

    // garante slug único
    let slug = slugify(data.displayName);
    const slugExists = await prisma.professional.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (slugExists && slugExists.userId !== session.user.id) slug = `${slug}-${Date.now()}`;

    const allSpecialties = [...new Set([...(specialties ?? []), ...(services ?? [])])];

    const professionalData = {
      ...profileData,
      image: null,
      galleryUrls: [],
      phone:     phone ? normalizePhone(phone) : undefined,
      whatsapp:  whatsapp ? normalizePhone(whatsapp) : undefined,
      verificationUrl: null,
      verificationType: "biometria",
      kycProvider: DIDIT_PROVIDER,
      kycSessionId: diditVerification.sessionId,
      kycStatus: diditVerification.status,
      escortCategory,
      slug,
      bio:       profileData.bio ?? "",
      birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
      status:    "PENDING_REVIEW" as const,
      verified:  false,
      docStatus: "APPROVED",
      verifStatus: "APPROVED",
      registrationSubmittedAt: new Date(),
      completionRulesVersion: 2,
      currentServiceCity: profileData.city,
      currentServiceState: profileData.state,
      currentServiceNeighborhood: profileData.bairro ?? null,
      locationUpdatedAt: new Date(),
      locationVerificationStatus: "VERIFIED",
    };
    const initialPhotos = [normalizedImage, ...normalizedGalleryUrls]
      .filter((url): url is string => Boolean(url))
      .filter((url, index, values) => values.indexOf(url) === index);

    const professional = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.professional.update({
          where: { userId: session.user.id },
          data: {
            ...professionalData,
            specialties: {
              deleteMany: {},
              create: allSpecialties.map((name) => ({ name })),
            },
            photos: {
              deleteMany: {},
              create: initialPhotos.map((url, order) => ({ url, order, cover: order === 0 })),
            },
          },
          include: { specialties: true },
        })
        : await tx.professional.create({
          data: {
            ...professionalData,
            userId: session.user.id,
            accessGrandfathered: false,
            billingStatus: "PENDING_APPROVAL",
            specialties: {
              create: allSpecialties.map((name) => ({ name })),
            },
            photos: {
              create: initialPhotos.map((url, order) => ({ url, order, cover: order === 0 })),
            },
          },
          include: { specialties: true },
        });

      await tx.professionalSubmissionReceipt.upsert({
        where: { professionalId: saved.id },
        create: { professionalId: saved.id, status: "PENDING" },
        update: existing?.status === "CORRECTION_REQUIRED"
          ? { status: "PENDING", providerId: null, sentAt: null, lastError: null }
          : {},
      });
      return saved;
    });

    await logAudit({
      actorIdentifier: user.email,
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: professional.id,
      changes: { moderationAction: existing?.status === "CORRECTION_REQUIRED" ? "resubmit" : "submit", resultingStatus: "PENDING_REVIEW" },
      reason: existing?.status === "CORRECTION_REQUIRED" ? "Cadastro corrigido e reenviado para análise" : "Cadastro enviado para análise",
    });
    const receiptStatus = await deliverProfessionalSubmissionReceipt(professional.id, user.email, user.name);
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: existing?.status === "CORRECTION_REQUIRED" ? "PROFILE_RESUBMITTED" : "PROFILE_SUBMITTED",
        title: existing?.status === "CORRECTION_REQUIRED" ? "Cadastro reenviado" : "Cadastro enviado para análise",
        body: "Recebemos seu cadastro completo. Você será avisada quando a análise terminar.",
        link: "/profissional/analise",
      },
    });
    return NextResponse.json({
      ok: true,
      professionalId: professional.id,
      status: professional.status,
      alreadySubmitted: false,
      receiptStatus,
    }, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof ProfessionalDiditError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        error: err.issues[0]?.message ?? "Revise os campos obrigatórios.",
        code: "validation_error",
        fields: err.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      }, { status: 400 });
    }
    console.error("[professionals] falha ao salvar cadastro", {
      userId: session.user.id,
      reason: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
