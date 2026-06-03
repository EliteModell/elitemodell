export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  available: z.boolean(),
  startTime: timeSchema,
  endTime: timeSchema,
});

const scheduleSchema = z.object({
  schedule: z.array(daySchema).length(7),
});

const DAY_LABELS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function isEndAfterStart(startTime: string, endTime: string) {
  return endTime > startTime;
}

async function getProfessional(userId: string) {
  return prisma.professional.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const professional = await getProfessional(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });
  }

  const schedule = await prisma.schedule.findMany({
    where: { professionalId: professional.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ schedule });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const professional = await getProfessional(session.user.id);
  if (!professional) {
    return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });
  }

  try {
    const data = scheduleSchema.parse(await req.json());
    const availableDays = data.schedule.filter((day) => day.available);
    const invalidDay = availableDays.find((day) => !isEndAfterStart(day.startTime, day.endTime));
    if (invalidDay) {
      return NextResponse.json({ error: "O horario final precisa ser depois do horario inicial." }, { status: 400 });
    }

    const firstAvailable = availableDays[0];
    await prisma.$transaction([
      prisma.schedule.deleteMany({ where: { professionalId: professional.id } }),
      ...(availableDays.length
        ? [
            prisma.schedule.createMany({
              data: availableDays.map((day) => ({
                professionalId: professional.id,
                dayOfWeek: day.dayOfWeek,
                startTime: day.startTime,
                endTime: day.endTime,
                available: true,
              })),
            }),
          ]
        : []),
      prisma.professional.update({
        where: { id: professional.id },
        data: {
          diasDisponiveis: availableDays.map((day) => DAY_LABELS[day.dayOfWeek]),
          horarioInicio: firstAvailable?.startTime ?? null,
          horarioFim: firstAvailable?.endTime ?? null,
        },
      }),
    ]);

    const schedule = await prisma.schedule.findMany({
      where: { professionalId: professional.id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ schedule });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Confira os horarios informados." }, { status: 400 });
    }
    return NextResponse.json({ error: "Nao foi possivel atualizar sua agenda agora." }, { status: 500 });
  }
}
