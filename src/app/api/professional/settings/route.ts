export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";

const MAX_PAUSE_DAYS = Number(process.env.PROFESSIONAL_MAX_PAUSE_DAYS ?? 60);

const settingsSchema = z.object({
  hidePhone: z.boolean().optional(),
  hideAge: z.boolean().optional(),
  pause: z.object({
    enabled: z.boolean(),
    days: z.number().int().min(1).max(MAX_PAUSE_DAYS).optional(),
    reason: z.string().max(240).optional(),
  }).optional(),
  boost: z.object({
    enabled: z.boolean(),
    days: z.number().int().min(1).max(30).optional(),
  }).optional(),
  presentationVideoUrl: z.string().url().nullable().optional(),
  removePresentationVideo: z.boolean().optional(),
});

async function currentProfessional(userId: string) {
  return prisma.professional.findUnique({
    where: { userId },
    select: {
      id: true,
      slug: true,
      status: true,
      verified: true,
      hidePhone: true,
      hideAge: true,
      pauseStartedAt: true,
      pauseUntil: true,
      pauseReason: true,
      boostActive: true,
      boostStartedAt: true,
      boostUntil: true,
      boostSource: true,
      presentationVideoUrl: true,
      presentationVideoStatus: true,
      presentationVideoRejectReason: true,
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  await refreshExpiredProfessionalTimers();
  const professional = await currentProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });

  return NextResponse.json({ professional, maxPauseDays: MAX_PAUSE_DAYS });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  await refreshExpiredProfessionalTimers();
  const professional = await currentProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });

  try {
    const body = settingsSchema.parse(await req.json());
    const now = new Date();
    const data: Record<string, unknown> = {};

    if (body.hidePhone !== undefined) data.hidePhone = body.hidePhone;
    if (body.hideAge !== undefined) data.hideAge = body.hideAge;

    if (body.pause) {
      if (body.pause.enabled) {
        const days = body.pause.days ?? 7;
        data.status = "PAUSED";
        data.pauseStartedAt = now;
        data.pauseUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        data.pauseReason = body.pause.reason?.trim() || null;
      } else {
        data.status = professional.verified ? "ACTIVE" : "PENDING_REVIEW";
        data.pauseStartedAt = null;
        data.pauseUntil = null;
        data.pauseReason = null;
      }
    }

    if (body.boost) {
      if (body.boost.enabled) {
        const days = body.boost.days ?? 1;
        data.boostActive = true;
        data.boostStartedAt = now;
        data.boostUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        data.boostSource = "manual_pending_billing";
      } else {
        data.boostActive = false;
        data.boostStartedAt = null;
        data.boostUntil = null;
        data.boostSource = null;
      }
    }

    if (body.removePresentationVideo) {
      data.presentationVideoUrl = null;
      data.presentationVideoStatus = "NONE";
      data.presentationVideoRejectReason = null;
    } else if (body.presentationVideoUrl !== undefined) {
      data.presentationVideoUrl = body.presentationVideoUrl;
      data.presentationVideoStatus = body.presentationVideoUrl ? "PENDING" : "NONE";
      data.presentationVideoRejectReason = null;
    }

    const updated = await prisma.professional.update({
      where: { id: professional.id },
      data,
      select: {
        id: true,
        slug: true,
        status: true,
        hidePhone: true,
        hideAge: true,
        pauseStartedAt: true,
        pauseUntil: true,
        pauseReason: true,
        boostActive: true,
        boostStartedAt: true,
        boostUntil: true,
        boostSource: true,
        presentationVideoUrl: true,
        presentationVideoStatus: true,
        presentationVideoRejectReason: true,
      },
    });

    return NextResponse.json({ professional: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[professional/settings]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
