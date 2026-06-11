export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { isApprovedProfessional } from "@/lib/property-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.adultVerified)) {
    return NextResponse.json(
      { error: "Verificacao de maioridade obrigatoria." },
      { status: 403, headers: ageGateCacheHeaders() },
    );
  }

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      photos:    { orderBy: { order: "asc" } },
      amenities: true,
      host:      { select: { name: true, image: true, createdAt: true } },
      reviews:   {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!property) {
    return NextResponse.json(
      { error: "Imovel nao encontrado." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }

  const canViewDraft =
    session?.user?.role === "ADMIN" || property.hostId === session?.user?.id;
  if (property.status !== "ACTIVE" && !canViewDraft) {
    return NextResponse.json(
      { error: "Imovel nao encontrado." },
      { status: 404, headers: ageGateCacheHeaders() },
    );
  }

  if (property.status === "ACTIVE" && !canViewDraft && !(await isApprovedProfessional(session.user))) {
    return NextResponse.json(
      { error: "Local disponivel apenas para profissionais aprovadas." },
      { status: 403, headers: ageGateCacheHeaders() },
    );
  }

  const { hostId, ...publicProperty } = property;
  void hostId;
  const safeProperty = {
    ...publicProperty,
    photos: publicProperty.photos
      .map((photo) => ({ ...photo, url: stripLegacyPublicStorageUrl(photo.url) }))
      .filter((photo): photo is typeof photo & { url: string } => Boolean(photo.url)),
    host: {
      ...publicProperty.host,
      image: stripLegacyPublicStorageUrl(publicProperty.host.image),
    },
    reviews: publicProperty.reviews.map((review) => ({
      ...review,
      author: {
        ...review.author,
        image: stripLegacyPublicStorageUrl(review.author.image),
      },
    })),
  };
  return NextResponse.json(safeProperty, { headers: ageGateCacheHeaders() });
}
