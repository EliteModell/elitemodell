export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  propertyId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NÃ£o autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = session.user.role;
  const status = searchParams.get("status");

  const where: Prisma.BookingWhereInput = {};
  if (role === "GUEST") where.guestId = session.user.id;
  if (role === "HOST") {
    where.property = { hostId: session.user.id };
  }
  if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
    where.status = status as BookingStatus;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      property: { select: { id: true, title: true, city: true, photos: { take: 1 } } },
      guest: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NÃ£o autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    const nights = differenceInCalendarDays(checkOut, checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || nights < 1) {
      return NextResponse.json({ error: "Datas invÃ¡lidas." }, { status: 400 });
    }
    if (checkIn < today) {
      return NextResponse.json({ error: "Check-in nao pode estar no passado." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
    if (!property || property.status !== "ACTIVE") {
      return NextResponse.json({ error: "ImÃ³vel nÃ£o disponÃ­vel." }, { status: 404 });
    }
    if (property.hostId === session.user.id) {
      return NextResponse.json({ error: "Voce nao pode reservar seu proprio espaco." }, { status: 400 });
    }
    if (data.guests > property.maxGuests) {
      return NextResponse.json({ error: `Este espaco aceita no maximo ${property.maxGuests} pessoas.` }, { status: 400 });
    }

    if (nights < property.minNights) {
      return NextResponse.json({ error: `Minimo de ${property.minNights} periodo.` }, { status: 400 });
    }

    // Check conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        propertyId: data.propertyId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          { checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
        ],
      },
    });
    if (conflict) {
      return NextResponse.json({ error: "ImÃ³vel jÃ¡ reservado nestas datas." }, { status: 409 });
    }

    // Coupon
    let discount = 0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: data.couponCode } });
      const subtotal = nights * property.pricePerNight;
      const couponExpired = coupon?.expiresAt ? coupon.expiresAt < new Date() : false;
      const couponLimitReached = coupon?.maxUses ? coupon.usedCount >= coupon.maxUses : false;
      const couponBelowMinimum = coupon?.minBooking ? subtotal < coupon.minBooking : false;

      if (coupon && coupon.active && !couponExpired && !couponLimitReached && !couponBelowMinimum) {
        discount = coupon.type === "PERCENTAGE" ? subtotal * (coupon.value / 100) : coupon.value;
      } else if (data.couponCode) {
        return NextResponse.json({ error: "Cupom invalido ou expirado." }, { status: 400 });
      }
    }

    const subtotal = nights * property.pricePerNight;
    const serviceFee = subtotal * 0.1;
    const totalPrice = subtotal + property.cleaningFee + serviceFee - discount;

    const booking = await prisma.booking.create({
      data: {
        propertyId: data.propertyId,
        guestId: session.user.id,
        checkIn,
        checkOut,
        guests: data.guests,
        nights,
        pricePerNight: property.pricePerNight,
        cleaningFee: property.cleaningFee,
        serviceFee,
        discount,
        totalPrice,
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        notes: data.notes,
        status: property.instantBook ? "CONFIRMED" : "PENDING",
        hostPayout: totalPrice * 0.9,
      },
    });

    if (data.couponCode && discount > 0) {
      await prisma.coupon.update({
        where: { code: data.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

