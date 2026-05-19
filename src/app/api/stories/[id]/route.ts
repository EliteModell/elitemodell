export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIP } from "@/lib/security";

const idSchema = z.string().cuid();

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Nao encontrado." }, { status: 404 });

  const story = await prisma.story.findUnique({ where: { id: parsed.data } });
  if (!story || story.userId !== session.user.id) return NextResponse.json({ error: "Nao encontrado." }, { status: 404 });

  await prisma.story.delete({ where: { id: parsed.data } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const limited = enforceRateLimit(
    `story-view:${parsed.data}:${getClientIP(req)}`,
    120,
    60 * 1000,
    "Muitas visualizacoes em pouco tempo."
  );
  if (limited) return limited;

  await prisma.story.update({ where: { id: parsed.data }, data: { views: { increment: 1 } } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
