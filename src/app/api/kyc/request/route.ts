import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.consentGiven) {
    return NextResponse.json({ error: "Consentimento é obrigatório." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clientStatus: true, birthDate: true, termsConsent: true, lgpdConsent: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (user.clientStatus === "VERIFIED") {
    return NextResponse.json({ error: "Conta já verificada." }, { status: 400 });
  }

  if (user.clientStatus === "PENDING_REVIEW") {
    return NextResponse.json({ error: "Verificação já em análise." }, { status: 400 });
  }

  // Verificar se tem os dados básicos preenchidos
  if (!user.termsConsent || !user.lgpdConsent) {
    return NextResponse.json(
      { error: "Aceite os Termos de Uso e a Política de Privacidade primeiro." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      clientStatus: "PENDING_REVIEW",
      kycSubmittedAt: new Date(),
      kycRejectionReason: null,
      termsVersion: "v1.0",
    },
  });

  return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
}
