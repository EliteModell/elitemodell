export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";
import { resolveProfessionalAccess } from "@/lib/professional-access";
import { assertApprovedMediaUrls } from "@/lib/approved-media";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
  publicCacheHeaders,
} from "@/lib/public-professional-profile";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  await refreshExpiredProfessionalTimers();
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      bio: true,
      city: true,
      state: true,
      bairro: true,
      phone: true,
      whatsapp: true,
      instagram: true,
      website: true,
      hidePhone: true,
      priceMin: true,
      priceMax: true,
      pricePerHour: true,
      price30min: true,
      price2h: true,
      priceOvernight: true,
      priceWebcam: true,
      paymentMethods: true,
      escortCategory: true,
      birthDate: true,
      hideAge: true,
      height: true,
      weight: true,
      hairColor: true,
      eyeColor: true,
      ethnicity: true,
      signo: true,
      hasTattoos: true,
      hasSilicone: true,
      isDepilada: true,
      attendanceTypes: true,
      servesGenders: true,
      idiomas: true,
      diasDisponiveis: true,
      horarioInicio: true,
      horarioFim: true,
      services: true,
      servicesNotOffered: true,
      fetishes: true,
      amenities: true,
      serviceCities: true,
      approximateLocation: true,
      image: true,
      galleryUrls: true,
      presentationVideoUrl: true,
      presentationVideoStatus: true,
      presentationVideoRejectReason: true,
      status: true,
      verified: true,
      featured: true,
      accessGrandfathered: true,
      freeAccessStartedAt: true,
      freeAccessEndsAt: true,
      pauseUntil: true,
      pauseReason: true,
      boostActive: true,
      boostUntil: true,
      activePlanId: true,
      planPriority: true,
      onlineVisible: true,
      lastOnlineAt: true,
      profileViews: true,
      contactClicks: true,
      rating: true,
      totalReviews: true,
      totalAppointments: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          image: true,
          createdAt: true,
          premiumUntil: true,
          stories: {
            where: { expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            select: { id: true, mediaUrl: true, mediaType: true, thumbnail: true, views: true, createdAt: true },
          },
        },
      },
      photos: { orderBy: { order: "asc" } },
      specialties: true,
      schedule: { orderBy: { dayOfWeek: "asc" } },
      reviews: {
        where: { hidden: false },
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!professional) {
    return NextResponse.json(
      { error: "Profissional nao encontrado." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }
  const canViewDraft =
    session?.user?.role === "ADMIN" || professional.userId === session?.user?.id;
  const isPausedByDate = Boolean(professional.pauseUntil && professional.pauseUntil.getTime() > Date.now());
  const access = resolveProfessionalAccess(
    professional,
    professional.user,
    professional.status === "ACTIVE" || professional.status === "PAUSED",
  );
  if ((professional.status !== "ACTIVE" || isPausedByDate || !access.canAppearInSearch) && !canViewDraft) {
    return NextResponse.json(
      { error: "Profissional nao encontrado." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }

  const photos = canonicalProfessionalPhotos({
    photos: professional.photos,
    image: professional.image,
    galleryUrls: professional.galleryUrls,
  });
  const premiumActive = Boolean(professional.user.premiumUntil && professional.user.premiumUntil > new Date());
  const publicProfessional: Record<string, unknown> = {
    ...professional,
    user: {
      ...professional.user,
      image: stripLegacyPublicStorageUrl(professional.user.image),
    },
    image: photos.find((photo) => photo.cover)?.url ?? photos[0]?.url ?? null,
    galleryUrls: photos.filter((photo) => !photo.cover).map((photo) => photo.url),
    photos,
    avatar: stripLegacyPublicStorageUrl(professional.user.image),
    stories: professional.user.stories
      .map((story) => ({
        ...story,
        mediaUrl: stripLegacyPublicStorageUrl(story.mediaUrl),
        thumbnail: stripLegacyPublicStorageUrl(story.thumbnail),
      }))
      .filter((story): story is typeof story & { mediaUrl: string } => Boolean(story.mediaUrl)),
    online: isProfessionalOnline(professional.lastOnlineAt, professional.onlineVisible),
    age: professional.hideAge && !canViewDraft ? null : calculateAge(professional.birthDate),
    sponsored: professional.boostActive && (!professional.boostUntil || professional.boostUntil > new Date()),
    plan: premiumActive ? professional.activePlanId : null,
    planPriority: premiumActive ? professional.planPriority : 0,
    phone: professional.hidePhone && !canViewDraft ? null : professional.phone,
    whatsapp: professional.hidePhone && !canViewDraft ? null : professional.whatsapp,
    birthDate: professional.hideAge && !canViewDraft ? null : professional.birthDate,
    presentationVideoUrl:
      professional.presentationVideoStatus === "APPROVED" || canViewDraft
        ? stripLegacyPublicStorageUrl(professional.presentationVideoUrl)
        : null,
  };
  delete publicProfessional.userId;
  delete publicProfessional.accessGrandfathered;
  delete publicProfessional.freeAccessStartedAt;
  delete publicProfessional.freeAccessEndsAt;
  delete publicProfessional.lastOnlineAt;
  delete publicProfessional.onlineVisible;
  delete publicProfessional.activePlanId;
  delete publicProfessional.presentationVideoRejectReason;
  delete publicProfessional.pauseReason;
  if (!canViewDraft) delete publicProfessional.birthDate;
  const publicUser = publicProfessional.user as Record<string, unknown>;
  delete publicUser.premiumUntil;
  delete publicUser.stories;
  return NextResponse.json(publicProfessional, {
    headers: canViewDraft ? ageGateCacheHeaders() : publicCacheHeaders(),
  });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Strip Brazil country code if present: 55 + DDD(2) + number(8 or 9) = 12 or 13 digits
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits.slice(0, 11);
}

const updateSchema = z.object({
  displayName: z.string().min(2).optional(),
  bio: z.string().min(20).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  bairro: z.string().max(120).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  pricePerHour: z.number().positive().optional(),
  price30min: z.number().positive().optional(),
  price2h: z.number().positive().optional(),
  priceOvernight: z.number().positive().optional(),
  priceWebcam: z.number().positive().optional(),
  image: z.string().url().nullable().optional(),
  galleryUrls: z.array(z.string().url()).max(12).optional(),
  photos: z.array(z.object({
    url: z.string().url(),
    cover: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    caption: z.string().max(160).nullable().optional(),
  })).max(12).optional(),
  specialties: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  servicesNotOffered: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  serviceCities: z.array(z.string()).optional(),
  approximateLocation: z.string().max(160).nullable().optional(),
  paymentMethods: z.array(z.string()).optional(),
  attendanceTypes: z.array(z.string()).optional(),
  servesGenders: z.array(z.string()).optional(),
  idiomas: z.array(z.string()).optional(),
  diasDisponiveis: z.array(z.string()).optional(),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
  onlineVisible: z.boolean().optional(),
  hidePhone: z.boolean().optional(),
  hideAge: z.boolean().optional(),
  presentationVideoUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const professional = await prisma.professional.findUnique({ where: { slug } });
  if (!professional) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (professional.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Proibido." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const { specialties, presentationVideoUrl, phone, whatsapp, photos, ...profileData } = data;
    await assertApprovedMediaUrls({
      urls: [
        ...(data.image ? [data.image] : []),
        ...(data.galleryUrls ?? []),
        ...(photos?.map((photo) => photo.url) ?? []),
      ],
      requestUrl: req.url,
      ownerId: professional.userId,
      allowedFolderPrefixes: ["profiles"],
    });
    if (presentationVideoUrl) {
      await assertApprovedMediaUrls({
        urls: [presentationVideoUrl],
        requestUrl: req.url,
        ownerId: professional.userId,
        allowedFolderPrefixes: ["profile-videos"],
      });
    }
    const normalizedPhotos = photos?.map((photo, index) => ({ ...photo, order: photo.order ?? index })) ?? null;
    const coverPhoto = normalizedPhotos?.find((photo) => photo.cover) ?? null;
    const updateData: Prisma.ProfessionalUpdateInput = {
      ...profileData,
      ...(phone !== undefined && { phone: phone ? normalizePhone(phone) : null }),
      ...(whatsapp !== undefined && { whatsapp: whatsapp ? normalizePhone(whatsapp) : null }),
    };

    if (normalizedPhotos) {
      updateData.image = null;
      updateData.galleryUrls = [];
    }

    if (presentationVideoUrl !== undefined) {
      updateData.presentationVideoUrl = presentationVideoUrl;
      updateData.presentationVideoStatus = presentationVideoUrl ? "PENDING" : "NONE";
      updateData.presentationVideoRejectReason = null;
    }

    const updated = await prisma.professional.update({
      where: { slug },
      data: {
        ...updateData,
        ...(normalizedPhotos && {
          photos: {
            deleteMany: {},
            create: normalizedPhotos.map((photo, index) => ({
              url: photo.url,
              caption: photo.caption ?? null,
              cover: coverPhoto ? photo.url === coverPhoto.url : false,
              order: index,
            })),
          },
        }),
        ...(specialties !== undefined && {
          specialties: {
            deleteMany: {},
            create: specialties.map((name) => ({ name })),
          },
        }),
      },
      include: { specialties: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message.toLowerCase().includes("midia")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
