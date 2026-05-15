export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      photos:    { orderBy: { order: "asc" } },
      amenities: true,
      host:      { select: { id: true, name: true, image: true, createdAt: true } },
      reviews:   {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  const canViewDraft =
    session?.user?.role === "ADMIN" || property.hostId === session?.user?.id;
  if (property.status !== "ACTIVE" && !canViewDraft) {
    return NextResponse.json({ error: "Imovel nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(property);
}
