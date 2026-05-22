export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  confirmation: z.literal("EXCLUIR MINHA CONTA"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    void body; // validação já garante o valor correto

    const userId = session.user.id;

    // Verificar se há pagamentos pendentes antes de excluir
    const pendingPayments = await prisma.payment.count({
      where: { userId, status: "PENDING" },
    });

    if (pendingPayments > 0) {
      return NextResponse.json(
        { error: "Você tem pagamentos pendentes. Aguarde a conclusão antes de excluir a conta." },
        { status: 400 }
      );
    }

    // Anonimizar dados pessoais conforme LGPD — não deletar registros financeiros
    const anonymizedEmail = `deleted_${userId}@excluido.elitemodell.local`;

    await prisma.$transaction([
      // Anonimiza o usuário
      prisma.user.update({
        where: { id: userId },
        data: {
          name: "Conta excluída",
          email: anonymizedEmail,
          phone: null,
          image: null,
          document: null,
          birthDate: null,
          city: null,
          state: null,
          blocked: true,
          blockReason: "Conta excluída pelo próprio usuário (LGPD)",
          blockedAt: new Date(),
        },
      }),
      // Remove sessões ativas
      prisma.session.deleteMany({ where: { userId } }),
      // Remove verificações de telefone
      prisma.phoneVerificationCode.deleteMany({ where: { userId } }),
      // Remove notificações
      prisma.notification.deleteMany({ where: { userId } }),
      // Remove favoritos
      prisma.favorite.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Digite exatamente EXCLUIR MINHA CONTA para confirmar." },
        { status: 400 }
      );
    }
    console.error("[delete-account]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
