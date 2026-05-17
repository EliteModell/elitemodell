export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      bio: true,
      city: true,
      state: true,
      bairro: true,
      whatsapp: true,
      instagram: true,
      website: true,
      priceMin: true,
      priceMax: true,
      pricePerHour: true,
      price30min: true,
      price2h: true,
      priceOvernight: true,
      priceWebcam: true,
      paymentMethods: true,
      escortCategory: true,
      birthDate: true,
      height: true,
      weight: true,
      hairColor: true,
      eyeColor: true,
      ethnicity: true,
      signo: true,
      hasTattoos: true,
      hasSilicone: true,
      isDepilada: true,
      attendanceTypes: true,
      servesGenders: true,
      idiomas: true,
      diasDisponiveis: true,
      horarioInicio: true,
      horarioFim: true,
      services: true,
      fetishes: true,
      image: true,
      galleryUrls: true,
      status: true,
      verified: true,
      featured: true,
      rating: true,
      totalReviews: true,
      totalAppointments: true,
      createdAt: true,
      user: { select: { name: true, image: true, createdAt: true } },
      photos: { orderBy: { order: "asc" } },
      specialties: true,
      schedule: { orderBy: { dayOfWeek: "asc" } },
      reviews: {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!professional) return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  const canViewDraft =
    session?.user?.role === "ADMIN" || professional.userId === session?.user?.id;
  if (professional.status !== "ACTIVE" && !canViewDraft) {
    return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  }

  const publicProfessional: Omit<typeof professional, "userId"> & { userId?: string } = {
    ...professional,
  };
  delete publicProfessional.userId;
  return NextResponse.json(publicProfessional);
}

const updateSchema = z.object({
  displayName: z.string().min(2).optional(),
  bio: z.string().min(20).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  specialties: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const professional = await prisma.professional.findUnique({ where: { slug } });
  if (!professional) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (professional.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Proibido." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const { specialties, ...profileData } = data;

    const updated = await prisma.professional.update({
      where: { slug },
      data: {
        ...profileData,
        ...(specialties !== undefined && {
          specialties: {
            deleteMany: {},
            create: specialties.map((name) => ({ name })),
          },
        }),
      },
      include: { specialties: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
