export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { stripLegacyPublicStorageUrl } from "@/lib/age-gate-policy";
import { resolveProfessionalAccess } from "@/lib/professional-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Entre para acessar o conteudo Premium." }, { status: 401 });
  }

  const [viewer, professional] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { premiumUntil: true },
    }),
    prisma.professional.findUnique({
      where: { slug },
      select: {
        userId: true,
        status: true,
        pauseUntil: true,
        accessGrandfathered: true,
        freeAccessStartedAt: true,
        freeAccessEndsAt: true,
        user: { select: { premiumUntil: true } },
        presentationVideoUrl: true,
        presentationVideoStatus: true,
        reviews: {
          where: { hidden: false },
          include: { author: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
  ]);
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrada." }, { status: 404 });
  }
  const ownerOrAdmin =
    professional.userId === session.user.id || session.user.role === "ADMIN";
  const now = new Date();
  const access = resolveProfessionalAccess(
    professional,
    professional.user,
    professional.status === "ACTIVE",
    now,
  );
  if (
    !ownerOrAdmin &&
    (professional.status !== "ACTIVE" ||
      Boolean(professional.pauseUntil && professional.pauseUntil > now) ||
      !access.canAppearInSearch)
  ) {
    return NextResponse.json({ error: "Profissional nao encontrada." }, { status: 404 });
  }
  const premium = Boolean(viewer?.premiumUntil && viewer.premiumUntil > now);
  if (!premium && !ownerOrAdmin) {
    return NextResponse.json(
      { error: "Conteudo exclusivo para clientes Premium.", reason: "PREMIUM_REQUIRED" },
      { status: 402 },
    );
  }

  return NextResponse.json({
    presentationVideoUrl:
      professional.presentationVideoStatus === "APPROVED" || ownerOrAdmin
        ? stripLegacyPublicStorageUrl(professional.presentationVideoUrl)
        : null,
    reviews: professional.reviews,
  });
}
