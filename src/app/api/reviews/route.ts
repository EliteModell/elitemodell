// API de avaliacoes de profissionais
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { enforceRateLimit, sanitizeInput } from "@/lib/security";

const createSchema = z.object({
  professionalId: z.string().cuid(),
  appointmentId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId obrigatorio." }, { status: 400 });
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
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const limited = enforceRateLimit(`reviews:${session.user.id}`, 8, 60 * 60 * 1000, "Muitas avaliacoes em pouco tempo.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const comment = sanitizeInput(data.comment);
    if (comment.length < 10) {
      return NextResponse.json({ error: "Comentario muito curto." }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    });
    if (!appointment) return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
    if (appointment.clientId !== session.user.id) {
      return NextResponse.json({ error: "Voce so pode avaliar seus proprios agendamentos." }, { status: 403 });
    }
    if (appointment.professionalId !== data.professionalId) {
      return NextResponse.json({ error: "Agendamento nao pertence a este profissional." }, { status: 400 });
    }
    if (appointment.status !== "COMPLETED") {
      return NextResponse.json({ error: "Apenas agendamentos concluidos podem ser avaliados." }, { status: 400 });
    }

    const existing = await prisma.professionalReview.findUnique({
      where: { appointmentId: data.appointmentId },
    });
    if (existing) {
      return NextResponse.json({ error: "Esse agendamento ja foi avaliado." }, { status: 409 });
    }

    const review = await prisma.professionalReview.create({
      data: {
        professionalId: data.professionalId,
        appointmentId: data.appointmentId,
        authorId: session.user.id,
        rating: data.rating,
        comment,
      },
    });

    const stats = await prisma.professionalReview.aggregate({
      where: { professionalId: data.professionalId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.professional.update({
      where: { id: data.professionalId },
      data: {
        rating: stats._avg.rating ?? 0,
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
