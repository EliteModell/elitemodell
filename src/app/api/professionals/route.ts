export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
  kycProvider:     z.string().optional(),
  kycSessionId:    z.string().optional(),
  kycStatus:       z.string().optional(),
}).superRefine((data, ctx) => {
  const addIssue = (path: string[], message: string) => {
    ctx.addIssue({ code: "custom", path, message });
  };

  if (!["MULHER", "HOMEM", "TRANS"].includes(data.escortCategory ?? "")) {
    addIssue(["escortCategory"], "Categoria invalida.");
  }
  if ((data.bio ?? "").trim().length < 80) {
    addIssue(["bio"], "A biografia deve ter pelo menos 80 caracteres.");
  }
  if (!data.birthDate) addIssue(["birthDate"], "Data de nascimento obrigatória.");
  if (data.attendanceTypes.length === 0) addIssue(["attendanceTypes"], "Informe o tipo de atendimento.");
  if (data.servesGenders.length === 0) addIssue(["servesGenders"], "Informe quem atende.");
  if (data.diasDisponiveis.length === 0) addIssue(["diasDisponiveis"], "Informe os dias disponiveis.");
  if (data.services.length === 0) addIssue(["services"], "Informe pelo menos um servico.");
  if (!data.pricePerHour && !data.price30min && !data.price2h && !data.priceOvernight && !data.priceWebcam) {
    addIssue(["pricePerHour"], "Informe pelo menos um valor.");
  }
  if (data.paymentMethods.length === 0) addIssue(["paymentMethods"], "Informe uma forma de pagamento.");
  if (!data.whatsapp || data.whatsapp.replace(/\D/g, "").length < 10) addIssue(["whatsapp"], "WhatsApp inválido.");
  if (!data.image) addIssue(["image"], "Foto principal obrigatória.");
  if (!data.docType || !data.docFrenteUrl || !data.docVersoUrl) addIssue(["docType"], "Documento completo obrigatório.");
  if (!data.verificationUrl && !data.kycSessionId) addIssue(["verificationUrl"], "Biometria ou verificação facial obrigatória.");
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
  const pageParam = Number(searchParams.get("page") ?? 1);
  const page      = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limitParam = Number(searchParams.get("limit") ?? 12);
  const limit     = Number.isFinite(limitParam) ? Math.min(24, Math.max(1, Math.floor(limitParam))) : 12;

  const where: Prisma.ProfessionalWhereInput = { status: "ACTIVE" };

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

  const orderBy: Prisma.ProfessionalOrderByWithRelationInput =
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

  return NextResponse.json(
    { professionals, total, page, pages: Math.ceil(total / limit) },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas anunciantes podem criar perfil profissional." }, { status: 403 });
  }

  const existing = await prisma.professional.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Você já tem um perfil profissional." }, { status: 409 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { category: true },
    });

    const { specialties, services, ...profileData } = data;
    const hasManualMedia =
      Boolean(profileData.verificationUrl) &&
      profileData.kycProvider !== "PERSONA";
    const normalizedKycProvider = hasManualMedia ? "MANUAL" : profileData.kycProvider;
    const normalizedKycStatus = hasManualMedia
      ? "KYC_MANUAL_PENDENTE"
      : profileData.kycStatus ?? (profileData.kycSessionId ? "PENDING" : "NOT_STARTED");
    const escortCategory = profileData.escortCategory
      || (user?.category && ["MULHER", "TRANS", "HOMEM"].includes(user.category) ? user.category : undefined);

    // garante slug único
    let slug = slugify(data.displayName);
    const slugExists = await prisma.professional.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now()}`;

    const allSpecialties = [...new Set([...(specialties ?? []), ...(services ?? [])])];

    const professional = await prisma.professional.create({
      data: {
        ...profileData,
        kycProvider: normalizedKycProvider,
        kycStatus: normalizedKycStatus,
        escortCategory,
        slug,
        userId:    session.user.id,
        bio:       profileData.bio ?? "",
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        status:    "PENDING_REVIEW",
        docStatus:  profileData.docFrenteUrl ? "PENDING" : "NOT_SENT",
        verifStatus: profileData.verificationUrl || profileData.kycSessionId ? "PENDING" : "NOT_SENT",
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
