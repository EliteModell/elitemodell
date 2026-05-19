// Mensagens vinculadas a uma Booking: chat hospede <-> anfitriao
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { enforceRateLimit, sanitizeInput } from "@/lib/security";

const createSchema = z.object({
  bookingId: z.string().cuid(),
  content: z.string().min(1).max(2000),
});

async function isBookingParticipant(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { select: { hostId: true } } },
  });
  if (!booking) return false;
  return booking.guestId === userId || booking.property.hostId === userId;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const since = searchParams.get("since");
  if (!bookingId) return NextResponse.json({ error: "bookingId obrigatorio." }, { status: 400 });

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

  await prisma.message.updateMany({
    where: { bookingId, senderId: { not: session.user.id }, read: false },
    data: { read: true },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const limited = enforceRateLimit(`messages:${session.user.id}`, 60, 60 * 1000, "Muitas mensagens em pouco tempo.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const content = sanitizeInput(data.content);
    if (!content) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });

    if (!(await isBookingParticipant(data.bookingId, session.user.id))) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        bookingId: data.bookingId,
        senderId: session.user.id,
        content,
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
