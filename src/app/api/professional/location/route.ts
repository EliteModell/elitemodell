export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { locationChangeNeedsReview, normalizeServiceLocation } from "@/lib/professional-location";
import { refreshExpiredTemporaryLocations } from "@/lib/professional-location-service";
import { sendProfessionalLocationEmail } from "@/lib/professional-extra-email";

const schema = z.object({
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2),
  neighborhood: z.string().trim().max(120).nullable().optional(),
  additionalNeighborhoods: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
  mode: z.enum(["PERMANENT", "TEMPORARY"]),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  hasOwnPlace: z.boolean().optional(),
  servesHotel: z.boolean().optional(),
  servesMotel: z.boolean().optional(),
  acceptsTravel: z.boolean().optional(),
  acceptsExternal: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.mode === "TEMPORARY") {
    if (!value.effectiveFrom || !value.effectiveUntil) ctx.addIssue({ code: "custom", path: ["effectiveUntil"], message: "Informe o início e o fim da viagem." });
    else if (new Date(value.effectiveUntil) <= new Date(value.effectiveFrom)) ctx.addIssue({ code: "custom", path: ["effectiveUntil"], message: "O fim da viagem deve ser posterior ao início." });
  }
});

function setAttendance(current: string[], input: z.infer<typeof schema>) {
  const controlled = ["Local próprio", "Hotéis", "Motéis", "Aceita viajar", "A domicílio"];
  const next = current.filter((item) => !controlled.includes(item));
  if (input.hasOwnPlace) next.push("Local próprio");
  if (input.servesHotel) next.push("Hotéis");
  if (input.servesMotel) next.push("Motéis");
  if (input.acceptsTravel) next.push("Aceita viajar");
  if (input.acceptsExternal) next.push("A domicílio");
  return next;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  await refreshExpiredTemporaryLocations();
  const professional = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    include: { locationChanges: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });
  return NextResponse.json({
    location: {
      city: professional.currentServiceCity || professional.city,
      state: professional.currentServiceState || professional.state,
      neighborhood: professional.currentServiceNeighborhood || professional.bairro,
      additionalNeighborhoods: professional.additionalServiceNeighborhoods,
      updatedAt: professional.locationUpdatedAt,
      verificationStatus: professional.locationVerificationStatus,
      temporaryFrom: professional.temporaryLocationFrom,
      temporaryUntil: professional.temporaryLocationUntil,
      attendanceTypes: professional.attendanceTypes,
    },
    history: professional.locationChanges,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    await refreshExpiredTemporaryLocations();
    const input = schema.parse(await req.json());
    const target = normalizeServiceLocation({ city: input.city, state: input.state, neighborhood: input.neighborhood });
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!professional) return NextResponse.json({ error: "Perfil profissional não encontrado." }, { status: 404 });
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentChanges = await prisma.professionalLocationChange.count({ where: { professionalId: professional.id, createdAt: { gte: since } } });
    const risk = locationChangeNeedsReview({
      kycApproved: professional.kycStatus === "APPROVED",
      recentChanges,
      stateChanged: professional.state !== target.state,
    });
    const verificationStatus = risk.review ? "LOCATION_REVIEW_REQUIRED" : "VERIFIED";
    const now = new Date();
    const effectiveFrom = input.mode === "TEMPORARY" ? new Date(input.effectiveFrom!) : now;
    const effectiveUntil = input.mode === "TEMPORARY" ? new Date(input.effectiveUntil!) : null;
    const appliesNow = input.mode === "PERMANENT" || effectiveFrom <= now;

    await prisma.$transaction(async (tx) => {
      await tx.professionalLocationChange.create({ data: {
        professionalId: professional.id,
        fromCity: professional.currentServiceCity || professional.city,
        fromState: professional.currentServiceState || professional.state,
        fromNeighborhood: professional.currentServiceNeighborhood || professional.bairro,
        toCity: target.city, toState: target.state, toNeighborhood: target.neighborhood,
        changeType: input.mode, effectiveFrom, effectiveUntil, verificationStatus, riskReason: risk.reason,
      } });
      await tx.professional.update({
        where: { id: professional.id },
        data: risk.review ? { locationVerificationStatus: verificationStatus } : {
          city: appliesNow ? target.city : professional.city, state: appliesNow ? target.state : professional.state, bairro: appliesNow ? target.neighborhood : professional.bairro,
          currentServiceCity: appliesNow ? target.city : professional.currentServiceCity, currentServiceState: appliesNow ? target.state : professional.currentServiceState, currentServiceNeighborhood: appliesNow ? target.neighborhood : professional.currentServiceNeighborhood,
          additionalServiceNeighborhoods: input.additionalNeighborhoods,
          latitude: input.latitude ?? professional.latitude, longitude: input.longitude ?? professional.longitude,
          locationUpdatedAt: appliesNow ? now : professional.locationUpdatedAt, locationVerificationStatus: verificationStatus,
          temporaryLocationFrom: input.mode === "TEMPORARY" ? effectiveFrom : null,
          temporaryLocationUntil: effectiveUntil,
          previousServiceLocation: input.mode === "TEMPORARY" ? {
            city: professional.currentServiceCity || professional.city,
            state: professional.currentServiceState || professional.state,
            neighborhood: professional.currentServiceNeighborhood || professional.bairro,
          } : Prisma.DbNull,
          attendanceTypes: setAttendance(professional.attendanceTypes, input),
        },
      });
      await tx.notification.create({ data: {
        userId: professional.userId,
        type: risk.review ? "LOCATION_REVIEW_REQUIRED" : "LOCATION_UPDATED",
        title: risk.review ? "Mudança de cidade em análise" : "Localização de atendimento atualizada",
        body: risk.review ? `A mudança para ${target.city}/${target.state} aguarda validação.` : appliesNow ? `Seu anúncio agora está em ${target.city}/${target.state}.` : `Sua viagem para ${target.city}/${target.state} foi agendada.`,
        link: "/profissional/localizacao",
      } });
    });
    if (professional.user.email) {
      sendProfessionalLocationEmail(professional.user.email, professional.user.name, {
        city: target.city, state: target.state, approved: !risk.review,
      }).catch((error) => console.error("[location-email]", error));
    }
    return NextResponse.json({ ok: true, verificationStatus, applied: !risk.review && appliesNow, scheduled: !risk.review && !appliesNow });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revise os dados da localização.", issues: error.issues }, { status: 400 });
    console.error("[professional/location]", error);
    return NextResponse.json({ error: "Não foi possível atualizar a localização." }, { status: 500 });
  }
}
