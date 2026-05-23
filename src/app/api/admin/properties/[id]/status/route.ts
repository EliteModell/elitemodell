export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
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
    select: { id: true, hostId: true, status: true },
  });

  if (!property) {
    return NextResponse.json({ error: "Imovel nao encontrado." }, { status: 404 });
  }

  if (body.action === "approve") {
    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: property.id },
        data: { status: "ACTIVE" },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: property.hostId },
        data: { role: "HOST", accountType: "host" },
        select: { id: true },
      });

      await tx.hostProfile.upsert({
        where: { userId: property.hostId },
        create: { userId: property.hostId },
        update: {},
      });
    });

    return NextResponse.json({ ok: true, status: "ACTIVE" });
  }

  await prisma.property.update({
    where: { id: property.id },
    data: { status: "REJECTED" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
