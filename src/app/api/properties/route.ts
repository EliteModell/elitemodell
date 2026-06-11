export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma, PropertyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ageGateCacheHeaders, stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { canViewApprovedProperties } from "@/lib/property-access";
import { assertApprovedMediaUrls } from "@/lib/approved-media";

const createSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.nativeEnum(PropertyType).default(PropertyType.APARTMENT),
  address: z.string().min(5),
  bairro: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().default("Brasil"),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  pricePerNight: z.number().positive(),
  cleaningFee: z.number().min(0).default(0),
  maxGuests: z.number().int().positive(),
  bedrooms: z.number().int().positive(),
  beds: z.number().int().positive(),
  bathrooms: z.number().int().positive(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("12:00"),
  minNights: z.number().int().positive().default(1),
  instantBook: z.boolean().default(false),
  allowPets: z.boolean().default(false),
  allowSmoking: z.boolean().default(false),
  allowParties: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
}).superRefine((data, ctx) => {
  const addIssue = (path: string[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (data.photos.length === 0) addIssue(["photos"], "Envie pelo menos uma foto do espaço.");
  if (data.amenities.length === 0) addIssue(["amenities"], "Selecione pelo menos um item de estrutura.");
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.adultVerified)) {
    return NextResponse.json(
      { error: "Verificacao de maioridade obrigatoria." },
      { status: 403, headers: ageGateCacheHeaders() },
    );
  }
  if (!(await canViewApprovedProperties(session.user))) {
    return NextResponse.json(
      { error: "Locais disponiveis apenas para contas autorizadas." },
      { status: 403, headers: ageGateCacheHeaders() },
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const city = searchParams.get("city");
  const models = Number(searchParams.get("models") ?? searchParams.get("guests") ?? 1);
  const priceMax = Number(searchParams.get("priceMax") ?? 99999);
  const sortBy = searchParams.get("sortBy") ?? "rating";
  const pageParam = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limitParam = Number(searchParams.get("limit") ?? 12);
  const limit = Number.isFinite(limitParam) ? Math.min(24, Math.max(1, Math.floor(limitParam))) : 12;

  const where: Prisma.PropertyWhereInput = { status: "ACTIVE" };
  const locationSearch = search || city;
  if (locationSearch) {
    where.OR = [
      { title: { contains: locationSearch, mode: "insensitive" } },
      { city: { contains: locationSearch, mode: "insensitive" } },
      { state: { contains: locationSearch, mode: "insensitive" } },
      { bairro: { contains: locationSearch, mode: "insensitive" } },
      { address: { contains: locationSearch, mode: "insensitive" } },
    ];
  }
  if (models) where.maxGuests = { gte: models };
  if (priceMax) where.pricePerNight = { lte: priceMax };

  const orderBy: Prisma.PropertyOrderByWithRelationInput = sortBy === "price_asc" ? { pricePerNight: "asc" }
    : sortBy === "price_desc" ? { pricePerNight: "desc" }
    : { rating: "desc" };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        photos: { take: 1, orderBy: { order: "asc" } },
        amenities: true,
        host: { select: { name: true, image: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  const publicProperties = properties.map((property) => {
    const { hostId, ...safe } = property;
    void hostId;
    return {
      ...safe,
      photos: safe.photos
        .map((photo) => ({ ...photo, url: stripLegacyPublicStorageUrl(photo.url) }))
        .filter((photo): photo is typeof photo & { url: string } => Boolean(photo.url)),
      host: {
        ...safe.host,
        image: stripLegacyPublicStorageUrl(safe.host.image),
      },
    };
  });

  return NextResponse.json(
    { properties: publicProperties, total, page, pages: Math.ceil(total / limit) },
    { headers: ageGateCacheHeaders() },
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, accountType: true },
  });
  const canSubmitHostProperty = Boolean(currentUser);
  if (!canSubmitHostProperty) {
    return NextResponse.json({ error: "Apenas anunciantes podem cadastrar espaços." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const { amenities, photos, ...propertyData } = data;
    await assertApprovedMediaUrls({
      urls: photos,
      requestUrl: req.url,
      ownerId: session.user.id,
      allowedFolderPrefixes: ["properties"],
    });

    const property = await prisma.$transaction(async (tx) => {
      if (currentUser?.role !== "ADMIN" && currentUser?.accountType !== "host") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { accountType: "host" },
          select: { id: true },
        });
      }

      await tx.hostProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id },
        update: {},
      });

      return tx.property.create({
        data: {
          ...propertyData,
          hostId: session.user.id,
          status: "PENDING_REVIEW",
          amenities: { create: amenities.map((name) => ({ name })) },
          photos: { create: photos.map((url, order) => ({ url, order })) },
        },
        include: { amenities: true, photos: true },
      });
    });

    return NextResponse.json(property, { status: 201 });
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

