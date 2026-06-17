export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const result = await prisma.professional.updateMany({
    where: { userId: session.user.id },
    data: { lastOnlineAt: new Date() },
  });

  return NextResponse.json({ ok: result.count > 0 });
}
