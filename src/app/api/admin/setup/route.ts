export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Endpoint de primeira configuração: promove o usuário logado a ADMIN
// Só funciona se ainda não existe nenhum ADMIN no banco.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  // Verifica se já existe algum ADMIN
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });

  if (existingAdmin) {
    return NextResponse.json(
      { error: "Já existe um administrador. Entre em contato com ele para obter acesso." },
      { status: 403 }
    );
  }

  // Promove o usuário atual a ADMIN
  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "ADMIN" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, message: "Você foi promovido a ADMIN. Faça logout e login novamente para acessar o painel." });
}
