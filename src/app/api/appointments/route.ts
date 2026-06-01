export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/security";

const createSchema = z.object({
  professionalSlug: z.string(),
  date: z.string(),
  duration: z.number().int().positive().default(60),
  contactMethod: z.string().default("whatsapp"),
  notes: z.string().optional(),
  voucherId: z.string().cuid().optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(AppointmentStatus),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const pageParam = Number(searchParams.get("page") ?? 1);
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 50;
  const role = session.user.role;

  const where: Prisma.AppointmentWhereInput = {};

  if (role === "ADMIN") {
    // admin sees all
  } else {
    const professional = await prisma.professional.findUnique({ where: { userId: session.user.id } });
    if (professional) {
      where.OR = [
        { clientId: session.user.id },
        { professionalId: professional.id },
      ];
    } else {
      where.clientId = session.user.id;
    }
  }

  if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
    where.status = status as AppointmentStatus;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      professional: { select: { displayName: true, slug: true } },
      client: { select: { name: true, email: true, image: true } },
      voucher: { select: { id: true, code: true, value: true, status: true } },
    },
    orderBy: { date: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const limited = enforceRateLimit(`appointments:${session.user.id}`, 20, 60 * 60 * 1000, "Muitos agendamentos em pouco tempo.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const professional = await prisma.professional.findUnique({
      where: { slug: data.professionalSlug },
      include: { voucherSettings: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });
    const phone = user?.phone ? user.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") : null;
    const isPausedByDate = Boolean(professional?.pauseUntil && professional.pauseUntil.getTime() > Date.now());
    if (!professional || professional.status !== "ACTIVE" || !professional.verified || isPausedByDate) {
      return NextResponse.json({ error: "Profissional não disponível." }, { status: 404 });
    }

    if (professional.userId === session.user.id) {
      return NextResponse.json({ error: "Você não pode agendar com você mesmo." }, { status: 400 });
    }

    const originalPrice = professional.pricePerHour ?? professional.priceMin ?? data.duration;
    let voucherDiscount = 0;
    let finalPrice = originalPrice;

    const appointment = await prisma.$transaction(async (tx) => {
      if (data.voucherId) {
        if (!professional.voucherSettings?.acceptsVouchers) {
          throw new Error("Profissional não aceita vouchers promocionais.");
        }
        const voucher = await tx.clientVoucher.findFirst({
          where: {
            id: data.voucherId,
            AND: [
              {
                OR: [
                  { clientId: session.user.id },
                  ...(phone ? [{ recipientPhone: phone }, { whatsapp: phone }] : []),
                ],
              },
              { requiresPayment: false },
            ],
            status: "AVAILABLE",
            expiresAt: { gt: new Date() },
            appointmentId: null,
          },
        });
        if (!voucher) throw new Error("Voucher indisponível, vencido ou já usado.");
        voucherDiscount = Math.min(originalPrice, voucher.value);
        finalPrice = Math.max(0, originalPrice - voucherDiscount);
      }

      const created = await tx.appointment.create({
        data: {
          professionalId: professional.id,
          clientId: session.user.id,
          date: new Date(data.date),
          duration: data.duration,
          contactMethod: data.contactMethod,
          notes: data.notes,
          status: "PENDING",
          price: finalPrice,
          originalPrice,
          voucherDiscount,
          finalPrice,
        },
      });

      if (data.voucherId) {
        const claimed = await tx.clientVoucher.updateMany({
          where: {
            id: data.voucherId,
            AND: [
              {
                OR: [
                  { clientId: session.user.id },
                  ...(phone ? [{ recipientPhone: phone }, { whatsapp: phone }] : []),
                ],
              },
              { requiresPayment: false },
            ],
            status: "AVAILABLE",
            expiresAt: { gt: new Date() },
            appointmentId: null,
          },
          data: { status: "USED", usedAt: new Date(), appointmentId: created.id, clientId: session.user.id },
        });
        if (claimed.count !== 1) throw new Error("Voucher indisponível, vencido ou já usado.");
      }

      await tx.professional.update({
        where: { id: professional.id },
        data: { totalAppointments: { increment: 1 } },
      });

      return created;
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erro interno.";
    const status = message.includes("Voucher") || message.includes("voucher") || message.includes("Profissional") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const limited = enforceRateLimit(`appointments-update:${session.user.id}`, 60, 60 * 1000, "Muitas atualizacoes em pouco tempo.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.id },
      include: { professional: { select: { userId: true } } },
    });
    if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });

    const isAdmin = session.user.role === "ADMIN";
    const isProfessionalOwner = appointment.professional.userId === session.user.id;
    const isClientOwner = appointment.clientId === session.user.id;
    if (!isAdmin && !isProfessionalOwner && !isClientOwner) {
      return NextResponse.json({ error: "Proibido." }, { status: 403 });
    }

    if (isClientOwner && !isAdmin && !isProfessionalOwner && data.status !== "CANCELLED") {
      return NextResponse.json({ error: "Clientes podem apenas cancelar o proprio agendamento." }, { status: 403 });
    }

    const updated = await prisma.appointment.update({
      where: { id: data.id },
      data: { status: data.status },
      include: {
        professional: { select: { displayName: true, slug: true } },
        client: { select: { name: true, email: true, image: true } },
        voucher: { select: { id: true, code: true, value: true, status: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erro interno.";
    const status = message.includes("Voucher") || message.includes("voucher") || message.includes("Profissional") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

