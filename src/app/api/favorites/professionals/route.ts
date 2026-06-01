export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  professionalId: z.string().cuid(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const now = new Date();
  const { searchParams } = new URL(req.url);
  const pageParam = Number(searchParams.get("page") ?? 1);
  const limitParam = Number(searchParams.get("limit") ?? 30);
  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limit = Number.isFinite(limitParam) ? Math.min(60, Math.max(1, Math.floor(limitParam))) : 30;

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: session.user.id,
      professionalId: { not: null },
      professional: {
        is: {
          status: "ACTIVE",
          verified: true,
          OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }],
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      professional: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          city: true,
          state: true,
          image: true,
          verified: true,
          status: true,
          pauseUntil: true,
          rating: true,
          totalReviews: true,
          photos: { where: { cover: true }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return NextResponse.json({
    favorites: favorites
      .map((favorite) => ({
        id: favorite.id,
        createdAt: favorite.createdAt,
        professional: favorite.professional,
      })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const data = schema.parse(await req.json());
  const now = new Date();
  const professional = await prisma.professional.findFirst({
    where: {
      id: data.professionalId,
      status: "ACTIVE",
      verified: true,
      OR: [{ pauseUntil: null }, { pauseUntil: { lt: now } }],
    },
    select: { id: true },
  });

  if (!professional) return NextResponse.json({ error: "Perfil nao encontrado." }, { status: 404 });

  const favorite = await prisma.$transaction(async (tx) => {
    const item = await tx.favorite.upsert({
      where: {
        userId_professionalId: {
          userId: session.user.id,
          professionalId: professional.id,
        },
      },
      create: {
        userId: session.user.id,
        professionalId: professional.id,
      },
      update: {},
    });
    await tx.professionalProfileEvent.create({
      data: {
        professionalId: professional.id,
        eventType: "favorite",
        metadata: { source: "favorites_api" },
      },
    });
    return item;
  });

  return NextResponse.json({ favorite });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const data = schema.parse(await req.json());
  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, professionalId: data.professionalId },
  });

  return NextResponse.json({ ok: true });
}
