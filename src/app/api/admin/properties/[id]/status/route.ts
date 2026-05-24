export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["approve", "reject", "suspend"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      hostId: true,
      status: true,
      host: { select: { blocked: true, hostProfile: { select: { id: true } } } },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Imovel nao encontrado." }, { status: 404 });
  }

  if (body.action === "approve" && (property.host.blocked || !property.host.hostProfile)) {
    return NextResponse.json(
      { error: "Aprove o anfitriao antes de aprovar o imovel." },
      { status: 409 },
    );
  }

  const nextStatus =
    body.action === "approve" ? "ACTIVE" :
    body.action === "suspend" ? "INACTIVE" :
    "REJECTED";

  await prisma.property.update({
    where: { id: property.id },
    data: { status: nextStatus },
    select: { id: true },
  });

  await logAudit({
    adminId: session.user.id,
    action: body.action === "approve" ? "PROPERTY_APPROVED" : "PROPERTY_REJECTED",
    targetType: "PROPERTY",
    targetId: property.id,
    reason: body.reason || `property:${body.action}`,
    changes: {
      previousStatus: property.status,
      newStatus: nextStatus,
      hostId: property.hostId,
      hostApprovedAtReview: Boolean(property.host.hostProfile && !property.host.blocked),
    },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
