export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Endpoint de primeiro setup: promove o usuário logado a ADMIN.
// Requer o header x-setup-secret com valor igual a ADMIN_SETUP_SECRET.
// Se ADMIN_SETUP_SECRET não estiver configurado, o endpoint retorna 404.
// Após criar o primeiro admin, este endpoint se torna inoperante (retorna 403).
export async function POST(req: NextRequest) {
  const setupSecret = process.env.ADMIN_SETUP_SECRET?.trim();

  if (!setupSecret) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const providedSecret = req.headers.get("x-setup-secret")?.trim();
  if (!providedSecret || providedSecret !== setupSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  try {
    const promoted = await prisma.$transaction(async (tx) => {
      // Lock: verifica e promove atomicamente, sem race condition
      const existingAdmin = await tx.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true, email: true },
      });

      if (existingAdmin) {
        const err = new Error("ADMIN_EXISTS");
        throw err;
      }

      return tx.user.update({
        where: { id: session.user.id },
        data: { role: "ADMIN" },
        select: { id: true, email: true },
      });
    });

    return NextResponse.json({
      ok: true,
      adminId: promoted.id,
      message: "Você foi promovido a ADMIN. Faça logout e login novamente para acessar o painel.",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ADMIN_EXISTS") {
      return NextResponse.json(
        { error: "Já existe um administrador. Entre em contato com ele para obter acesso." },
        { status: 403 }
      );
    }
    console.error("[admin/setup] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
