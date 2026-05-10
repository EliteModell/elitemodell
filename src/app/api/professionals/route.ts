export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  displayName:     z.string().min(2),
  bio:             z.string().optional().default(""),
  city:            z.string().min(2),
  state:           z.string().min(2),
  bairro:          z.string().optional(),

  // Contato
  phone:           z.string().optional(),
  whatsapp:        z.string().optional(),
  instagram:       z.string().optional(),
  website:         z.string().optional(),

  // Preços
  priceMin:        z.number().positive().optional(),
  priceMax:        z.number().positive().optional(),
  pricePerHour:    z.number().positive().optional(),
  price30min:      z.number().positive().optional(),
  price2h:         z.number().positive().optional(),
  priceOvernight:  z.number().positive().optional(),
  priceWebcam:     z.number().positive().optional(),
  paymentMethods:  z.array(z.string()).optional().default([]),

  // Perfil físico
  escortCategory:  z.string().optional(),
  birthDate:       z.string().optional(),
  height:          z.number().optional(),
  weight:          z.number().optional(),
  hairColor:       z.string().optional(),
  eyeColor:        z.string().optional(),
  ethnicity:       z.string().optional(),
  signo:           z.string().optional(),
  hasTattoos:      z.boolean().optional().default(false),
  hasSilicone:     z.boolean().optional().default(false),
  isDepilada:      z.boolean().optional().default(true),

  // Atendimento
  attendanceTypes: z.array(z.string()).optional().default([]),
  servesGenders:   z.array(z.string()).optional().default([]),
  idiomas:         z.array(z.string()).optional().default([]),
  diasDisponiveis: z.array(z.string()).optional().default([]),
  horarioInicio:   z.string().optional(),
  horarioFim:      z.string().optional(),

  // Serviços (obrigatório pelo menos 1)
  specialties:     z.array(z.string()).optional().default([]),
  services:        z.array(z.string()).optional().default([]),
  fetishes:        z.array(z.string()).optional().default([]),

  // Fotos
  image:           z.string().optional(),
  galleryUrls:     z.array(z.string()).optional().default([]),

  // Verificação de documentos
  docType:         z.string().optional(),
  docFrenteUrl:    z.string().optional(),
  docVersoUrl:     z.string().optional(),
  docStatus:       z.string().optional().default("PENDING"),
  verifStatus:     z.string().optional().default("PENDING"),
  verificationUrl: z.string().optional(),
  verificationType:z.string().optional(),
  verificationCode:z.string().optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search");
  const specialty = searchParams.get("specialty");
  const city      = searchParams.get("city");
  const category  = searchParams.get("category");
  const priceMax  = searchParams.get("priceMax");
  const sortBy    = searchParams.get("sortBy") ?? "rating";
  const page      = Number(searchParams.get("page") ?? 1);
  const limit     = 12;

  const where: any = { status: "ACTIVE" };

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { city:        { contains: search, mode: "insensitive" } },
      { bio:         { contains: search, mode: "insensitive" } },
    ];
  }
  if (city)     where.city = { contains: city, mode: "insensitive" };
  if (category) where.escortCategory = category.toUpperCase();
  if (priceMax) where.priceMin = { lte: Number(priceMax) };
  if (specialty) where.specialties = { some: { name: { contains: specialty, mode: "insensitive" } } };

  const orderBy: any =
    sortBy === "price_asc"  ? { priceMin: "asc" } :
    sortBy === "price_desc" ? { priceMin: "desc" } :
    sortBy === "reviews"    ? { totalReviews: "desc" } :
    { rating: "desc" };

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, displayName: true,
        city: true, state: true, bairro: true,
        image: true,
        escortCategory: true, birthDate: true,
        height: true, weight: true, hairColor: true, eyeColor: true, ethnicity: true,
        hasTattoos: true, hasSilicone: true,
        priceMin: true, pricePerHour: true, price30min: true,
        attendanceTypes: true, servesGenders: true,
        rating: true, totalReviews: true, totalAppointments: true,
        verified: true, featured: true,
        photos:     { where: { cover: true }, take: 1 },
        specialties: true,
      },
    }),
    prisma.professional.count({ where }),
  ]);

  return NextResponse.json({ professionals, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const existing = await prisma.professional.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Você já tem um perfil profissional." }, { status: 409 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const { specialties, services, ...profileData } = data;

    // garante slug único
    let slug = slugify(data.displayName);
    const slugExists = await prisma.professional.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now()}`;

    const allSpecialties = [...new Set([...(specialties ?? []), ...(services ?? [])])];

    const professional = await prisma.professional.create({
      data: {
        ...profileData,
        slug,
        userId:    session.user.id,
        bio:       profileData.bio ?? "",
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        status:    "PENDING_REVIEW",
        docStatus:  profileData.docFrenteUrl ? "PENDING" : "NOT_SENT",
        verifStatus: profileData.verificationUrl ? "PENDING" : "NOT_SENT",
        specialties: {
          create: allSpecialties.map((name) => ({ name })),
        },
      },
      include: { specialties: true },
    });

    return NextResponse.json(professional, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
