export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  canViewProfessionalContact,
  normalizeContactVisibility,
} from "@/lib/professional-contact";
import { resolveProfessionalAccess } from "@/lib/professional-access";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = await enforceRateLimitAsync(
    `professional-contact:${getClientIP(req)}`,
    40,
    10 * 60 * 1000,
  );
  if (limited) return limited;

  const { slug } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      status: true,
      pauseUntil: true,
      accessGrandfathered: true,
      freeAccessStartedAt: true,
      freeAccessEndsAt: true,
      phone: true,
      whatsapp: true,
      hidePhone: true,
      contactVisibility: true,
      user: { select: { premiumUntil: true } },
    },
  });
  const now = new Date();
  const access = professional
    ? resolveProfessionalAccess(
        professional,
        professional.user,
        professional.status === "ACTIVE",
        now,
      )
    : null;
  if (
    !professional ||
    professional.status !== "ACTIVE" ||
    Boolean(professional.pauseUntil && professional.pauseUntil > now) ||
    !access?.canAppearInSearch
  ) {
    return NextResponse.json({ error: "Profissional nao encontrada." }, { status: 404 });
  }

  const ownerOrAdmin =
    professional.userId === session?.user?.id || session?.user?.role === "ADMIN";
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { premiumUntil: true },
      })
    : null;
  const visibility = normalizeContactVisibility(
    professional.contactVisibility,
    professional.hidePhone,
  );
  const premium = Boolean(viewer?.premiumUntil && viewer.premiumUntil > now);
  if (!canViewProfessionalContact({
    visibility,
    authenticated: Boolean(session?.user?.id),
    premium,
    ownerOrAdmin,
  })) {
    if (!session?.user?.id && visibility === "LOGGED_IN") {
      return NextResponse.json(
        { error: "Entre para visualizar este contato.", reason: "LOGIN_REQUIRED" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Este contato e exclusivo para clientes Premium.", reason: "PREMIUM_REQUIRED" },
      { status: 402 },
    );
  }

  return NextResponse.json({
    phone: professional.phone,
    whatsapp: professional.whatsapp,
    visibility,
  });
}
