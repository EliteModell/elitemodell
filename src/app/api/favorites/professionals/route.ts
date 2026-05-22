export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  professionalId: z.string().cuid(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id, professionalId: { not: null } },
    orderBy: { createdAt: "desc" },
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
          rating: true,
          totalReviews: true,
          photos: { where: { cover: true }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return NextResponse.json({
    favorites: favorites
      .filter((favorite) => favorite.professional?.status === "ACTIVE")
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
  const professional = await prisma.professional.findFirst({
    where: { id: data.professionalId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!professional) return NextResponse.json({ error: "Perfil nao encontrado." }, { status: 404 });

  const favorite = await prisma.favorite.upsert({
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
