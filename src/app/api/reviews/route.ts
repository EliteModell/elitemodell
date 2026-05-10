// API de avaliações de profissionais
// GET: lista reviews de um profissional
// POST: cria review (precisa ter agendamento concluído)
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  professionalId: z.string(),
  appointmentId:  z.string(),
  rating:         z.number().int().min(1).max(5),
  comment:        z.string().min(10).max(1000),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId obrigatório." }, { status: 400 });
  }

  const reviews = await prisma.professionalReview.findMany({
    where: { professionalId },
    include: {
      author: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    // Verifica que o agendamento existe, é do usuário e foi concluído
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    });
    if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    if (appointment.clientId !== session.user.id) {
      return NextResponse.json({ error: "Você só pode avaliar seus próprios agendamentos." }, { status: 403 });
    }
    if (appointment.status !== "COMPLETED") {
      return NextResponse.json({ error: "Apenas agendamentos concluídos podem ser avaliados." }, { status: 400 });
    }

    // Verifica que ainda não foi avaliado
    const existing = await prisma.professionalReview.findUnique({
      where: { appointmentId: data.appointmentId },
    });
    if (existing) {
      return NextResponse.json({ error: "Esse agendamento já foi avaliado." }, { status: 409 });
    }

    const review = await prisma.professionalReview.create({
      data: {
        professionalId: data.professionalId,
        appointmentId:  data.appointmentId,
        authorId:       session.user.id,
        rating:         data.rating,
        comment:        data.comment,
      },
    });

    // Atualiza média do profissional
    const stats = await prisma.professionalReview.aggregate({
      where: { professionalId: data.professionalId },
      _avg:  { rating: true },
      _count: { rating: true },
    });
    await prisma.professional.update({
      where: { id: data.professionalId },
      data: {
        rating:       stats._avg.rating ?? 0,
        totalReviews: stats._count.rating ?? 0,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[reviews]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
