export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import { getPublicProfessionalWhere } from "@/lib/public-professional-access";
import { authorizeAdultContentRequest } from "@/lib/adult-content-access";
import { controlledMediaAssetId, isPublishableStoryAsset, normalizeControlledMediaUrl } from "@/lib/public-professional-media";
import { professionalCityFilter } from "@/lib/public-city-search";
import { publicServiceLocation } from "@/lib/professional-location";

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
  institutional?: boolean;
  stories: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    thumbnail: string | null;
    caption: string | null;
    views: number;
    createdAt: Date;
  }>;
};

const createSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image"),
  thumbnail: z.string().url().nullable().optional(),
  caption: z.string().trim().max(240).nullable().optional(),
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
  const limited = await enforceRateLimitAsync(`public-stories:${getClientIP(req)}`, 180, 60 * 1000, "Muitas consultas de stories em pouco tempo.");
  if (limited) return limited;
  const url = new URL(req.url);
  const adultAccess = await authorizeAdultContentRequest(req, {
    allowAgeDeclaration: url.searchParams.get("mine") !== "1",
  });
  if (!adultAccess.ok) return NextResponse.json({ error: adultAccess.error }, { status: adultAccess.status, headers: adultAccess.headers });
  const now = new Date();
  const session = adultAccess.session;
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
      select: { id: true, mediaUrl: true, mediaType: true, thumbnail: true, caption: true, views: true, expiresAt: true, createdAt: true },
    });
    const safeStories = stories
      .map((story) => ({
        ...story,
        mediaUrl: stripLegacyPublicStorageUrl(story.mediaUrl),
        thumbnail: stripLegacyPublicStorageUrl(story.thumbnail),
        caption: story.caption,
      }))
      .filter((story): story is typeof story & { mediaUrl: string } => Boolean(story.mediaUrl));
    return NextResponse.json({ stories: safeStories }, { headers: ageGateCacheHeaders() });
  }

  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");
  const professionalWhere = await getPublicProfessionalWhere(now);
  const cityWhere = city ? await professionalCityFilter(city, state ?? "") : null;

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: now },
      user: {
        professional: {
          is: {
            AND: [professionalWhere, ...(cityWhere ? [cityWhere] : [])],
            verified: true,
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
              currentServiceCity: true,
              currentServiceState: true,
              currentServiceNeighborhood: true,
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

  const assetIds = Array.from(new Set(stories
    .map((story) => controlledMediaAssetId(story.mediaUrl))
    .filter((id): id is string => Boolean(id))));
  const assets = assetIds.length ? await prisma.uploadAsset.findMany({
    where: { id: { in: assetIds } },
    select: {
      id: true, userId: true, folder: true, category: true, status: true,
      moderationStatus: true, approvedBucket: true, approvedPath: true,
      uploadCompletedAt: true, malwareStatus: true, ageIdentityStatus: true,
      consentStatus: true, adminReviewRequired: true, adminReviewStatus: true,
      takedownStatus: true,
    },
  }) : [];
  const publicStoryAssets = new Map(assets.filter((asset) =>
    isPublishableStoryAsset(asset, asset.userId),
  ).map((asset) => [asset.id, asset]));

  const grouped = Object.values(
    stories.reduce<Record<string, StoryGroupResponse>>((acc, story) => {
      const assetId = controlledMediaAssetId(story.mediaUrl);
      const asset = assetId ? publicStoryAssets.get(assetId) : null;
      const mediaUrl = asset && asset.userId === story.userId ? normalizeControlledMediaUrl(story.mediaUrl) : null;
      if (!mediaUrl) return acc;
      const professional = story.user.professional;
      if (!professional) return acc;
      if (!acc[story.userId]) {
        const serviceLocation = publicServiceLocation(professional);
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
          city: serviceLocation.city,
          state: serviceLocation.state,
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
        caption: story.caption,
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

  const eliteStories: StoryGroupResponse = {
    userId: "elite-platform",
    professionalId: "elite-platform",
    slug: "politica-conteudo",
    nome: "Elite Stories",
    foto: "/android-chrome-512x512.png",
    city: "",
    state: "",
    verified: true,
    sponsored: false,
    planPriority: 0,
    institutional: true,
    stories: [],
  };

  return NextResponse.json([eliteStories, ...grouped], { headers: ageGateCacheHeaders() });
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

  const limited = await enforceRateLimitAsync(`stories:${session.user.id}`, 20, 60 * 60 * 1000, "Muitos stories em pouco tempo.");
  if (limited) return limited;

  try {
    const data = createSchema.parse(await req.json());
    const assetId = controlledAssetId(data.mediaUrl, req.url);
    if (assetId) {
      const asset = await prisma.uploadAsset.findUnique({
        where: { id: assetId },
        select: {
          id: true, userId: true, folder: true, category: true, status: true,
          moderationStatus: true, approvedBucket: true, approvedPath: true,
          uploadCompletedAt: true, malwareStatus: true, ageIdentityStatus: true,
          consentStatus: true, adminReviewRequired: true, adminReviewStatus: true,
          takedownStatus: true,
        },
      });
      if (
        !asset ||
        !isPublishableStoryAsset(asset, session.user.id)
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
        caption: data.caption ?? null,
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
