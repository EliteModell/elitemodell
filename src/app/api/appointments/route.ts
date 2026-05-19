export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  professionalSlug: z.string(),
  date: z.string(),
  duration: z.number().int().positive().default(60),
  contactMethod: z.string().default("whatsapp"),
  notes: z.string().optional(),
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
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const professional = await prisma.professional.findUnique({
      where: { slug: data.professionalSlug },
    });
    if (!professional || professional.status !== "ACTIVE") {
      return NextResponse.json({ error: "Profissional não disponível." }, { status: 404 });
    }

    if (professional.userId === session.user.id) {
      return NextResponse.json({ error: "Você não pode agendar com você mesmo." }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        clientId: session.user.id,
        date: new Date(data.date),
        duration: data.duration,
        contactMethod: data.contactMethod,
        notes: data.notes,
        status: "PENDING",
      },
    });

    // Increment total appointments counter
    await prisma.professional.update({
      where: { id: professional.id },
      data: { totalAppointments: { increment: 1 } },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NÃ£o autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.id },
      include: { professional: { select: { userId: true } } },
    });
    if (!appointment) return NextResponse.json({ error: "Agendamento nÃ£o encontrado." }, { status: 404 });

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
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

