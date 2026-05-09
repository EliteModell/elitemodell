export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    stories.reduce((acc: Record<string, any>, s) => {
      if (!acc[s.userId]) {
        acc[s.userId] = {
          userId: s.userId,
          nome: s.user.professional?.displayName ?? s.user.name ?? "Usuária",
          foto: s.user.professional?.photos?.[0]?.url ?? s.user.image ?? null,
          stories: [],
        };
      }
      acc[s.userId].stories.push({ id: s.id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, thumbnail: s.thumbnail, views: s.views, createdAt: s.createdAt });
      return acc;
    }, {})
  );

  return NextResponse.json(grouped);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { mediaUrl, mediaType, thumbnail } = await req.json();
  if (!mediaUrl) return NextResponse.json({ error: "URL da mídia obrigatória." }, { status: 400 });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: {
      userId: session.user.id,
      mediaUrl,
      mediaType: mediaType ?? "image",
      thumbnail: thumbnail ?? null,
      expiresAt,
    },
  });

  return NextResponse.json(story, { status: 201 });
}
