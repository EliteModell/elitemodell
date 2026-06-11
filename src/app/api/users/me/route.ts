export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getHostRegistrationStatus, postLoginPathFromUser } from "@/lib/account-routes";
import { deriveAvailableProfiles } from "@/lib/account-profiles";
import { assertApprovedMediaUrls } from "@/lib/approved-media";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  city: z.string().min(2).max(80).optional(),
  state: z.string().min(2).max(40).optional(),
  document: z.string().optional(),
  image: z.string().url().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, image: true, phone: true, phoneVerified: true, phoneVerifiedAt: true,
      city: true, state: true, document: true, role: true, accountType: true, category: true, birthDate: true, verified: true, credits: true, premiumUntil: true,
      lgpdConsent: true, termsConsent: true,
      stories: {
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
        select: { id: true, mediaUrl: true, mediaType: true, thumbnail: true, views: true, expiresAt: true, createdAt: true },
      },
      createdAt: true, clientProfile: true, hostProfile: true, professional: {
        select: {
          id: true,
          slug: true,
          status: true,
          verified: true,
          kycStatus: true,
          docStatus: true,
          verifStatus: true,
          displayName: true,
          bio: true,
          city: true,
          state: true,
          phone: true,
          whatsapp: true,
          instagram: true,
          website: true,
          hidePhone: true,
          listingPhoneUntil: true,
          hideAge: true,
          pauseStartedAt: true,
          pauseUntil: true,
          pauseReason: true,
          boostActive: true,
          boostStartedAt: true,
          boostUntil: true,
          boostSource: true,
          profileViews: true,
          contactClicks: true,
          presentationVideoUrl: true,
          presentationVideoStatus: true,
          presentationVideoRejectReason: true,
          priceMin: true,
          priceMax: true,
          image: true,
          galleryUrls: true,
          photos: {
            orderBy: { order: "asc" },
            select: { id: true, url: true, caption: true, cover: true, order: true, createdAt: true },
          },
          schedule: {
            orderBy: { dayOfWeek: "asc" },
            select: { id: true, dayOfWeek: true, startTime: true, endTime: true, available: true },
          },
          specialties: { select: { name: true } },
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              moderationStatus: true,
              author: { select: { name: true, email: true } },
              dispute: { select: { status: true, reason: true, adminNote: true } },
            },
          },
        },
      },
      properties: { select: { id: true, status: true }, orderBy: { createdAt: "desc" } },
    },
  });

  const hostStatus = getHostRegistrationStatus(user);
  return NextResponse.json(user ? {
    ...user,
    hostStatus,
    availableProfiles: deriveAvailableProfiles(user),
    activeProfileType: session.user.activeProfileType,
    redirectTo: postLoginPathFromUser(user),
  } : null);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.image) {
      await assertApprovedMediaUrls({
        urls: [data.image],
        requestUrl: req.url,
        ownerId: session.user.id,
        allowedFolderPrefixes: ["profiles"],
      });
    }
    if (data.phone) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true },
      });
      const normalized = data.phone.replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
      if (normalized && normalized !== current?.phone) {
        return NextResponse.json(
          { error: "Altere o telefone pelo fluxo de verificacao por codigo." },
          { status: 400 }
        );
      }
      delete data.phone;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true, phone: true, role: true },
    });

    return NextResponse.json(user);
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
