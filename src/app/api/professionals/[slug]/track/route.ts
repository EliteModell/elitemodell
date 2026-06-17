export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIP } from "@/lib/security";
import { publicCacheHeaders } from "@/lib/public-professional-profile";
import { publicProfessionalWhere } from "@/lib/public-professional-access";

const schema = z.object({
  eventType: z.enum(["profile_view", "contact_click", "favorite"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { eventType } = schema.parse(await req.json());
    const limited = enforceRateLimit(
      `professional-event:${slug}:${eventType}:${getClientIP(req)}`,
      eventType === "profile_view" ? 30 : 12,
      60 * 60 * 1000,
    );
    if (limited) return limited;
    const now = new Date();
    const professional = await prisma.professional.findFirst({
      where: {
        ...publicProfessionalWhere(now),
        slug,
      },
      select: { id: true },
    });
    if (!professional) return NextResponse.json({ ok: true }, { headers: publicCacheHeaders() });

    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.professionalProfileEvent.create({
        data: {
          professionalId: professional.id,
          eventType,
          metadata: {
            source: "public_profile",
            userAgent: req.headers.get("user-agent")?.slice(0, 180) ?? null,
          },
        },
      }),
    ];

    if (eventType === "profile_view" || eventType === "contact_click") {
      operations.push(
        prisma.professional.update({
          where: { id: professional.id },
          data: eventType === "profile_view"
            ? { profileViews: { increment: 1 } }
            : { contactClicks: { increment: 1 } },
        }),
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ ok: true }, { headers: publicCacheHeaders() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400, headers: publicCacheHeaders() });
    }
    console.error("[professionals/track]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500, headers: publicCacheHeaders() });
  }
}
