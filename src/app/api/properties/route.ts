export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PropertyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.nativeEnum(PropertyType).default(PropertyType.APARTMENT),
  address: z.string().min(5),
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
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const guests = Number(searchParams.get("guests") ?? 1);
  const priceMax = Number(searchParams.get("priceMax") ?? 99999);
  const sortBy = searchParams.get("sortBy") ?? "rating";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 12;

  const where: any = { status: "ACTIVE" };
  if (city) where.OR = [
    { city: { contains: city, mode: "insensitive" } },
    { address: { contains: city, mode: "insensitive" } },
  ];
  if (guests) where.maxGuests = { gte: guests };
  if (priceMax) where.pricePerNight = { lte: priceMax };

  const orderBy: any = sortBy === "price_asc" ? { pricePerNight: "asc" }
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

  return NextResponse.json({ properties, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NÃ£o autorizado." }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anfitriÃµes podem cadastrar imÃ³veis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const { amenities, ...propertyData } = data;

    const property = await prisma.property.create({
      data: {
        ...propertyData,
        hostId: session.user.id,
        status: "PENDING_REVIEW",
        amenities: { create: amenities.map((name) => ({ name })) },
      },
      include: { amenities: true },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

