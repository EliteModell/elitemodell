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
      host: { select: { blocked: true, accountType: true } },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  if (body.action === "approve" && property.host.blocked) {
    return NextResponse.json(
      { error: "O anfitrião está bloqueado. Desbloqueie a conta antes de aprovar o imóvel." },
      { status: 409 },
    );
  }

  const nextStatus =
    body.action === "approve" ? "ACTIVE" :
    body.action === "suspend" ? "INACTIVE" :
    "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: property.id },
      data: { status: nextStatus },
      select: { id: true },
    });

    if (body.action === "approve") {
      await tx.user.update({
        where: { id: property.hostId },
        data: { accountType: "host", blockReason: null },
      });
      await tx.hostProfile.upsert({
        where: { userId: property.hostId },
        create: { userId: property.hostId },
        update: {},
      });
    }
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
      hostBlockedAtReview: property.host.blocked,
      hostAccountTypeAtReview: property.host.accountType,
    },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
