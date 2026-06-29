export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { MANUAL_PENDING_STATUS, PERSONA_PENDING_STATUS } from "@/lib/persona";
import { DIDIT_PROVIDER, KYC_PENDING_STATUS } from "@/lib/professional-verification";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";
import { activeProfessionalAccessWhere } from "@/lib/professional-access";
import { createProfessionalSchema } from "@/lib/professional-profile-schema";
import { assertApprovedMediaUrls } from "@/lib/approved-media";
import { normalizeContactVisibility } from "@/lib/professional-contact";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
  publicCacheHeaders,
} from "@/lib/public-professional-profile";
import { citySearchVariants } from "@/lib/brazilian-location";
import { normalizeControlledMediaUrl } from "@/lib/public-professional-media";

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
  await refreshExpiredProfessionalTimers(now);

  // Apenas status ACTIVE é obrigatório. "verified" é badge visual, não bloqueio de visibilidade.
  const where: Prisma.ProfessionalWhereInput = { status: "ACTIVE" };
  const andFilters: Prisma.ProfessionalWhereInput[] = [
    { OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }] },
    activeProfessionalAccessWhere(now),
  ];

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { city:        { contains: search, mode: "insensitive" } },
      { bio:         { contains: search, mode: "insensitive" } },
    ];
  }
  if (city) {
    const cityOptions = citySearchVariants(city);
    andFilters.push({
      OR: cityOptions.map((name) => ({ city: { contains: name, mode: "insensitive" } })),
    });
  }
  if (state) andFilters.push({ state: { equals: state.toUpperCase(), mode: "insensitive" } });
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
        image: true, galleryUrls: true,
        escortCategory: true, birthDate: true,
        height: true, weight: true, hairColor: true, eyeColor: true, ethnicity: true,
        hasTattoos: true, hasSilicone: true,
        hideAge: true,
        phone: true,
        whatsapp: true,
        hidePhone: true,
        contactVisibility: true,
        priceMin: true, pricePerHour: true, price30min: true,
        attendanceTypes: true, servesGenders: true,
        services: true,
        rating: true, totalReviews: true, totalAppointments: true,
        verified: true, featured: true,
        boostActive: true, boostUntil: true,
        activePlanId: true, planPriority: true,
        onlineVisible: true, lastOnlineAt: true,
        profileViews: true, contactClicks: true,
        user: { select: { image: true, premiumUntil: true } },
        photos: { orderBy: { order: "asc" } },
        specialties: true,
      },
    }),
    prisma.professional.count({ where }),
  ]);

  console.log("[CLIENT_SEARCH] filters", { search, city, state, category, sortBy, page, limit });
  console.log("[CLIENT_SEARCH] professionals found", professionals.length, "/ total", total);

  const safeList = professionals.map(({
    hidePhone,
    contactVisibility,
    galleryUrls,
    birthDate,
    hideAge,
    onlineVisible,
    lastOnlineAt,
    activePlanId,
    planPriority,
    ...p
  }) => {
    const photos = canonicalProfessionalPhotos({ photos: p.photos, image: p.image, galleryUrls });
    const premiumActive = Boolean(p.user.premiumUntil && p.user.premiumUntil > now);
    const normalizedContactVisibility = normalizeContactVisibility(contactVisibility, hidePhone);
    return {
      ...p,
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
    { headers: publicCacheHeaders() },
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
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Você já tem um perfil profissional." }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = createProfessionalSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { category: true, email: true, emailVerified: true, clientStatus: true, kycSessionId: true },
    });

    if (!user?.emailVerified) {
      return NextResponse.json(
        {
          error: `Confirme seu email${user?.email ? ` (${user.email})` : ""} antes de enviar o cadastro para analise.`,
          code: "email_not_verified",
        },
        { status: 428 },
      );
    }

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
    const hasManualMedia =
      Boolean(profileData.verificationUrl) &&
      profileData.kycProvider !== "PERSONA";
    const normalizedKycProvider = hasManualMedia ? "MANUAL" : profileData.kycProvider;
    const normalizedKycStatus = hasManualMedia
      ? MANUAL_PENDING_STATUS
      : profileData.kycStatus ?? (profileData.kycSessionId ? PERSONA_PENDING_STATUS : "NOT_STARTED");
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
      kycProvider: normalizedKycProvider,
      kycStatus: normalizedKycStatus,
      escortCategory,
      slug,
      bio:       profileData.bio ?? "",
      birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
      status:    "PENDING_REVIEW" as const,
      verified:  false,
      docStatus:  normalizedKycStatus === "APPROVED" ? "APPROVED" : profileData.docFrenteUrl || normalizedKycProvider === DIDIT_PROVIDER ? "PENDING" : "NOT_SENT",
      verifStatus: normalizedKycStatus === "APPROVED" ? "APPROVED" : profileData.verificationUrl || profileData.kycSessionId ? "PENDING" : "NOT_SENT",
    };
    const initialPhotos = [normalizedImage, ...normalizedGalleryUrls]
      .filter((url): url is string => Boolean(url))
      .filter((url, index, values) => values.indexOf(url) === index);

    const professional = existing
      ? await prisma.professional.update({
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
      : await prisma.professional.create({
      data: {
        ...professionalData,
        userId:    session.user.id,
        accessGrandfathered: false,
        specialties: {
          create: allSpecialties.map((name) => ({ name })),
        },
        photos: {
          create: initialPhotos.map((url, order) => ({ url, order, cover: order === 0 })),
        },
      },
      include: { specialties: true },
    });

    return NextResponse.json(professional, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
