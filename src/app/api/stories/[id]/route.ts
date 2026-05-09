export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const story = await prisma.story.findUnique({ where: { id } });
  if (!story || story.userId !== session.user.id) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await prisma.story.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.story.update({ where: { id }, data: { views: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}
