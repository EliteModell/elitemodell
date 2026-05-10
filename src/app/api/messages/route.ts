// Mensagens vinculadas a uma Booking — chat hóspede ↔ anfitrião
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  bookingId: z.string(),
  content:   z.string().min(1).max(2000),
});

async function isBookingParticipant(bookingId: string, userId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { select: { hostId: true } } },
  });
  if (!b) return false;
  return b.guestId === userId || b.property.hostId === userId;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const since = searchParams.get("since"); // ISO date para polling incremental
  if (!bookingId) return NextResponse.json({ error: "bookingId obrigatório." }, { status: 400 });

  if (!(await isBookingParticipant(bookingId, session.user.id))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: {
      bookingId,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    include: { sender: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Marca como lidas as que não são minhas
  await prisma.message.updateMany({
    where: { bookingId, senderId: { not: session.user.id }, read: false },
    data:  { read: true },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    if (!(await isBookingParticipant(data.bookingId, session.user.id))) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        bookingId: data.bookingId,
        senderId:  session.user.id,
        content:   data.content,
      },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
