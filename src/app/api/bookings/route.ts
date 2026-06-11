export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canCreatePropertyUseRequest } from "@/lib/property-access";
import { sanitizeInput } from "@/lib/security";
import { getClientIP } from "@/lib/security";
import { calculateBookingAmounts, toCents, fromCents } from "@/lib/money";
import {
  CHECKOUT_LEGAL_KEYS,
  latestLegalDocumentVersions,
  recordUserAcceptances,
} from "@/lib/legal-acceptance";
import { createHash } from "crypto";

const createSchema = z.object({
  propertyId: z.string().cuid(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  acceptedBookingTerms: z.literal(true),
  acceptedRefundPolicy: z.literal(true),
});

function isHostSession(session: { user: { accountType?: string | null; availableProfiles?: string[] | null } }) {
  const accountType = (session.user.accountType ?? "").toLowerCase();
  return accountType === "host" || accountType === "property_host" || session.user.availableProfiles?.includes("HOST") === true;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const isHost = isHostSession(session);

  if (session.user.role !== "ADMIN" && !isHost && !(await canCreatePropertyUseRequest(session.user))) {
    return NextResponse.json({ error: "Solicitações de uso de local são exclusivas para profissionais aprovadas." }, { status: 403 });
  }

  const where: Prisma.BookingWhereInput = {};
  if (session.user.role === "ADMIN") {
  } else if (isHost) {
    where.property = { hostId: session.user.id };
  } else {
    where.guestId = session.user.id;
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
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!(await canCreatePropertyUseRequest(session.user))) {
    return NextResponse.json({ error: "Solicitações de uso de local são exclusivas para profissionais aprovadas." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    const nights = differenceInCalendarDays(checkOut, checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || nights < 1) {
      return NextResponse.json({ error: "Datas inválidas." }, { status: 400 });
    }
    if (checkIn < today) {
      return NextResponse.json({ error: "Check-in não pode estar no passado." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
    if (!property || property.status !== "ACTIVE") {
      return NextResponse.json({ error: "Local não disponível." }, { status: 404 });
    }
    if (property.hostId === session.user.id) {
      return NextResponse.json({ error: "Você não pode reservar seu próprio espaço." }, { status: 400 });
    }
    if (data.guests > property.maxGuests) {
      return NextResponse.json({ error: `Este local aceita no máximo ${property.maxGuests} modelos por vez.` }, { status: 400 });
    }
    if (nights < property.minNights) {
      return NextResponse.json({ error: `Mínimo de ${property.minNights} período.` }, { status: 400 });
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        propertyId: data.propertyId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [{ checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }],
      },
    });
    if (conflict) {
      return NextResponse.json({ error: "Local já possui solicitação confirmada neste período." }, { status: 409 });
    }

    let discountCents = 0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: data.couponCode } });
      const subtotalCents = nights * toCents(property.pricePerNight);
      const subtotal = fromCents(subtotalCents);
      const couponExpired = coupon?.expiresAt ? coupon.expiresAt < new Date() : false;
      const couponLimitReached = coupon?.maxUses ? coupon.usedCount >= coupon.maxUses : false;
      const couponBelowMinimum = coupon?.minBooking ? subtotal < coupon.minBooking : false;

      if (coupon && coupon.active && !couponExpired && !couponLimitReached && !couponBelowMinimum) {
        discountCents = coupon.type === "PERCENTAGE"
          ? Math.round((subtotalCents * coupon.value) / 100)
          : toCents(coupon.value);
        discountCents = Math.min(discountCents, subtotalCents);
      } else {
        return NextResponse.json({ error: "Cupom inválido ou expirado." }, { status: 400 });
      }
    }

    const bookingPolicy = await prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: {
        bookingServiceFeeBps: true,
        bookingPayoutDelayHours: true,
        bookingPayoutReleaseEvent: true,
        bookingContestationHours: true,
      },
    });
    const serviceFeeBasisPoints = bookingPolicy?.bookingServiceFeeBps ?? 1_000;
    const {
      subtotalCents,
      cleaningFeeCents,
      totalPriceCents,
      serviceFeeCents,
      hostPayoutCents,
    } = calculateBookingAmounts({
      nights,
      pricePerNightCents: toCents(property.pricePerNight),
      cleaningFeeCents: toCents(property.cleaningFee),
      discountCents,
      serviceFeeBasisPoints,
    });
    const disclosure = JSON.stringify({
      version: "booking-checkout-2026-06-10",
      propertyId: property.id,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      subtotalCents,
      cleaningFeeCents,
      discountCents,
      totalPriceCents,
      serviceFeeCents,
      hostPayoutCents,
      serviceFeeBasisPoints,
      cancellation: "Solicitacoes seguem a politica exibida no checkout e a legislacao aplicavel.",
      noShow: "No-show e divergencias exigem analise; nao ha decisao financeira automatica.",
      dispute: "Em disputa, o repasse pode ser retido ate conclusao da analise.",
      payout: "Repasse bloqueado ate aprovacao do modelo comercial, politica de cancelamento, homologacao da integracao e conclusao dos testes financeiros.",
    });
    const disclosureHash = createHash("sha256").update(disclosure).digest("hex");

    const booking = await prisma.$transaction(async (tx) => {
      const legalVersions = await latestLegalDocumentVersions(CHECKOUT_LEGAL_KEYS, tx);
      const checkoutVersion = legalVersions.get("checkout-notice") ?? legalVersions.get("payments-policy");
      const refundVersion = legalVersions.get("refund-policy");
      await recordUserAcceptances({
        tx,
        userId: session.user.id,
        userCategory: session.user.accountType,
        documentKeys: CHECKOUT_LEGAL_KEYS,
        source: "booking-create",
        acceptanceType: "CHECKOUT",
        req,
      });
      const created = await tx.booking.create({
        data: {
          propertyId: data.propertyId,
          guestId: session.user.id,
          checkIn,
          checkOut,
          guests: data.guests,
          nights,
          pricePerNight: property.pricePerNight,
          cleaningFee: fromCents(cleaningFeeCents),
          serviceFee: fromCents(serviceFeeCents),
          discount: fromCents(discountCents),
          totalPrice: fromCents(totalPriceCents),
          subtotalCents,
          cleaningFeeCents,
          serviceFeeCents,
          discountCents,
          totalPriceCents,
          hostPayoutCents,
          paymentMethod: data.paymentMethod,
          couponCode: data.couponCode,
          notes: data.notes ? sanitizeInput(data.notes) : undefined,
          status: property.instantBook ? "CONFIRMED" : "PENDING",
          hostPayout: fromCents(hostPayoutCents),
          checkInStatus: "NOT_CONFIRMED",
          payoutBlocked: true,
          payoutBlockedReason: "Modelo comercial, politica de cancelamento, integracao de repasse e testes ainda pendentes de aprovacao/homologacao.",
          contestationDeadline: bookingPolicy?.bookingContestationHours
            ? new Date(checkOut.getTime() + bookingPolicy.bookingContestationHours * 60 * 60 * 1000)
            : null,
          termsVersionId: checkoutVersion?.id ?? "booking-checkout-2026-06-10",
          refundPolicyVersionId: refundVersion?.id ?? "refund-policy-proposal-2026-06-10",
          acceptedAt: new Date(),
          acceptanceIp: getClientIP(req),
          acceptanceUserAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        },
      });
      await tx.checkoutAcceptance.create({
        data: {
          userId: session.user.id,
          productId: `booking:${created.id}`,
          productName: `Reserva ${property.title}`,
          dailyPrice: property.pricePerNight,
          totalPrice: fromCents(totalPriceCents),
          durationDays: nights,
          startsAt: checkIn,
          expectedEndsAt: checkOut,
          termsVersionId: checkoutVersion?.id ?? null,
          refundPolicyVersionId: refundVersion?.id ?? null,
          termsHash: checkoutVersion?.contentHash ?? disclosureHash,
          refundPolicyHash: refundVersion?.contentHash ?? disclosureHash,
          ipAddress: getClientIP(req),
          userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
          route: new URL(req.url).pathname,
          language: "pt-BR",
          acceptanceType: "CHECKOUT",
          required: true,
        },
      });
      await tx.bookingFinancialEvent.create({
        data: {
          bookingId: created.id,
          type: "BOOKING_CREATED",
          status: "PENDING_PAYMENT",
          grossCents: totalPriceCents,
          platformFeeCents: serviceFeeCents,
          hostNetCents: hostPayoutCents,
          metadata: {
            disclosureHash,
            paymentMethod: data.paymentMethod,
            proposalStatus: "PENDING_PARTNER_AND_LEGAL_APPROVAL",
            serviceFeeBasisPoints,
            payoutReleaseEvent: bookingPolicy?.bookingPayoutReleaseEvent ?? "CHECK_IN_CONFIRMED",
            payoutDelayHours: bookingPolicy?.bookingPayoutDelayHours ?? 24,
          },
        },
      });
      if (data.couponCode && discountCents > 0) {
        await tx.coupon.update({
          where: { code: data.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }
      return created;
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
