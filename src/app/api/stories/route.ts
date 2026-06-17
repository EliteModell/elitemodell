export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { enforceRateLimit } from "@/lib/security";
import { publicCacheHeaders } from "@/lib/public-professional-profile";
import { publicProfessionalWhere } from "@/lib/public-professional-access";

type StoryGroupResponse = {
  userId: string;
  professionalId: string;
  slug: string;
  nome: string;
  foto: string | null;
  city: string;
  state: string;
  verified: boolean;
  sponsored: boolean;
  planPriority: number;
  stories: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    thumbnail: string | null;
    views: number;
    createdAt: Date;
  }>;
};

const createSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image"),
  thumbnail: z.string().url().nullable().optional(),
});

function controlledAssetId(value: string, requestUrl: string) {
  try {
    const url = new URL(value, requestUrl);
    const expectedOrigin = new URL(requestUrl).origin;
    if (url.origin !== expectedOrigin) return null;
    const match = url.pathname.match(/^\/api\/media\/([^/]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const url = new URL(req.url);
  const session = await getServerSession(authOptions);
  if (url.searchParams.get("mine") === "1") {
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nao autorizado." },
        { status: 401, headers: ageGateCacheHeaders() },
      );
    }
    const stories = await prisma.story.findMany({
      where: { userId: session.user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, mediaUrl: true, mediaType: true, thumbnail: true, views: true, expiresAt: true, createdAt: true },
    });
    const safeStories = stories
      .map((story) => ({
        ...story,
        mediaUrl: stripLegacyPublicStorageUrl(story.mediaUrl),
        thumbnail: stripLegacyPublicStorageUrl(story.thumbnail),
      }))
      .filter((story): story is typeof story & { mediaUrl: string } => Boolean(story.mediaUrl));
    return NextResponse.json({ stories: safeStories }, { headers: ageGateCacheHeaders() });
  }

  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");
  const professionalWhere = publicProfessionalWhere(now);

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: now },
      user: {
        professional: {
          is: {
            ...professionalWhere,
            verified: true,
            ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
            ...(state ? { state: { equals: state.toUpperCase(), mode: "insensitive" } } : {}),
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          premiumUntil: true,
          professional: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              city: true,
              state: true,
              verified: true,
              image: true,
              boostActive: true,
              boostUntil: true,
              planPriority: true,
              photos: { where: { cover: true }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const grouped = Object.values(
    stories.reduce<Record<string, StoryGroupResponse>>((acc, story) => {
      const mediaUrl = stripLegacyPublicStorageUrl(story.mediaUrl);
      if (!mediaUrl) return acc;
      const professional = story.user.professional;
      if (!professional) return acc;
      if (!acc[story.userId]) {
        const sponsored = professional.boostActive && (!professional.boostUntil || professional.boostUntil > now);
        const premiumActive = Boolean(story.user.premiumUntil && story.user.premiumUntil > now);
        acc[story.userId] = {
          userId: story.userId,
          professionalId: professional.id,
          slug: professional.slug,
          nome: professional.displayName ?? story.user.name ?? "Usuaria",
          foto: stripLegacyPublicStorageUrl(story.user.image) ??
            stripLegacyPublicStorageUrl(professional.photos?.[0]?.url) ??
            stripLegacyPublicStorageUrl(professional.image) ??
            null,
          city: professional.city,
          state: professional.state,
          verified: professional.verified,
          sponsored,
          planPriority: premiumActive ? professional.planPriority : 0,
          stories: [],
        };
      }
      acc[story.userId].stories.push({
        id: story.id,
        mediaUrl,
        mediaType: story.mediaType,
        thumbnail: stripLegacyPublicStorageUrl(story.thumbnail),
        views: story.views,
        createdAt: story.createdAt,
      });
      return acc;
    }, {})
  ).sort((a, b) =>
    Number(b.sponsored) - Number(a.sponsored) ||
    b.planPriority - a.planPriority ||
    (b.stories[0]?.createdAt.getTime() ?? 0) - (a.stories[0]?.createdAt.getTime() ?? 0)
  );

  return NextResponse.json(grouped, { headers: publicCacheHeaders() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const professional = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    select: { status: true, verified: true },
  });

  if (!professional || professional.status !== "ACTIVE" || !professional.verified) {
    return NextResponse.json({ error: "Stories sao exclusivos para profissionais aprovadas." }, { status: 403 });
  }

  const limited = enforceRateLimit(`stories:${session.user.id}`, 20, 60 * 60 * 1000, "Muitos stories em pouco tempo.");
  if (limited) return limited;

  try {
    const data = createSchema.parse(await req.json());
    const assetId = controlledAssetId(data.mediaUrl, req.url);
    if (assetId) {
      const asset = await prisma.uploadAsset.findUnique({
        where: { id: assetId },
        select: { userId: true, folder: true, category: true, status: true },
      });
      if (
        !asset ||
        asset.userId !== session.user.id ||
        asset.status !== "APPROVED" ||
        !asset.folder.startsWith("stories") ||
        !["image", "video"].includes(asset.category)
      ) {
        return NextResponse.json({ error: "Midia nao aprovada para stories." }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: "Midia precisa vir da rota controlada /api/media." }, { status: 400 });
    }
    if (data.thumbnail && !controlledAssetId(data.thumbnail, req.url)) {
      return NextResponse.json({ error: "Thumbnail precisa vir da rota controlada /api/media." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId: session.user.id,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        thumbnail: data.thumbnail ?? null,
        expiresAt,
      },
    });

    return NextResponse.json(story, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
