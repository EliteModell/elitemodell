export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  displayName: z.string().min(2),
  bio: z.string().min(20),
  city: z.string().min(2),
  state: z.string().min(2),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  specialties: z.array(z.string()).min(1),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[Ì€-Í¯]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const specialty = searchParams.get("specialty");
  const city = searchParams.get("city");
  const priceMax = searchParams.get("priceMax");
  const sortBy = searchParams.get("sortBy") ?? "rating";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 12;

  const where: any = { status: "ACTIVE" };

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
    ];
  }
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (priceMax) where.priceMin = { lte: Number(priceMax) };
  if (specialty) where.specialties = { some: { name: { contains: specialty, mode: "insensitive" } } };

  const orderBy: any =
    sortBy === "price_asc" ? { priceMin: "asc" }
    : sortBy === "price_desc" ? { priceMin: "desc" }
    : sortBy === "reviews" ? { totalReviews: "desc" }
    : { rating: "desc" };

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        photos: { where: { cover: true }, take: 1 },
        specialties: true,
      },
    }),
    prisma.professional.count({ where }),
  ]);

  return NextResponse.json({ professionals, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NÃ£o autorizado." }, { status: 401 });

  const existing = await prisma.professional.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "VocÃª jÃ¡ tem um perfil profissional." }, { status: 409 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const { specialties, ...profileData } = data;

    let slug = slugify(data.displayName);
    const slugExists = await prisma.professional.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now()}`;

    const professional = await prisma.professional.create({
      data: {
        ...profileData,
        slug,
        userId: session.user.id,
        status: "PENDING_REVIEW",
        specialties: { create: specialties.map((name) => ({ name })) },
      },
      include: { specialties: true },
    });

    return NextResponse.json(professional, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

