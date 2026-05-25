export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  reason: z.string().min(10).max(1200),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    const { reason } = schema.parse(await req.json());
    const review = await prisma.professionalReview.findUnique({
      where: { id },
      select: {
        id: true,
        professionalId: true,
        professional: { select: { userId: true } },
      },
    });

    if (!review) return NextResponse.json({ error: "Avaliacao nao encontrada." }, { status: 404 });
    if (review.professional.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Proibido." }, { status: 403 });
    }

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.professionalReviewDispute.upsert({
        where: { reviewId: review.id },
        create: {
          reviewId: review.id,
          professionalId: review.professionalId,
          authorId: session.user.id,
          reason: reason.trim(),
          status: "PENDING",
        },
        update: {
          reason: reason.trim(),
          status: "PENDING",
          adminNote: null,
        },
      });
      await tx.professionalReview.update({
        where: { id: review.id },
        data: { moderationStatus: "DISPUTED" },
      });
      return created;
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[professional/reviews/dispute]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
