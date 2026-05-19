export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security";

type StoryGroupResponse = {
  userId: string;
  nome: string;
  foto: string | null;
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

function isTrustedStorageUrl(url: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return true;
  return url.startsWith(`${supabaseUrl}/storage/v1/object/public/`);
}

export async function GET() {
  const now = new Date();
  const stories = await prisma.story.findMany({
    where: { expiresAt: { gt: now } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          professional: { select: { displayName: true, photos: { where: { cover: true }, take: 1 } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = Object.values(
    stories.reduce<Record<string, StoryGroupResponse>>((acc, story) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
          userId: story.userId,
          nome: story.user.professional?.displayName ?? story.user.name ?? "Usuaria",
          foto: story.user.professional?.photos?.[0]?.url ?? story.user.image ?? null,
          stories: [],
        };
      }
      acc[story.userId].stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        thumbnail: story.thumbnail,
        views: story.views,
        createdAt: story.createdAt,
      });
      return acc;
    }, {})
  );

  return NextResponse.json(grouped);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const limited = enforceRateLimit(`stories:${session.user.id}`, 20, 60 * 60 * 1000, "Muitos stories em pouco tempo.");
  if (limited) return limited;

  try {
    const data = createSchema.parse(await req.json());
    if (!isTrustedStorageUrl(data.mediaUrl) || (data.thumbnail && !isTrustedStorageUrl(data.thumbnail))) {
      return NextResponse.json({ error: "Midia precisa vir do storage da plataforma." }, { status: 400 });
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
