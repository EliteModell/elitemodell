export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      property: { include: { photos: { take: 1 } } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!booking) return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });

  // Só o hóspede ou o anfitrião podem ver
  const isOwner = booking.guestId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    const prop = await prisma.property.findUnique({ where: { id: booking.propertyId }, select: { hostId: true } });
    if (prop?.hostId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  }

  return NextResponse.json(booking);
}
