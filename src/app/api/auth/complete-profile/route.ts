export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { validateBirthDate } from "@/lib/age-validation";

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lgpdConsent: z.boolean(),
  termsConsent: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());

    if (!body.lgpdConsent || !body.termsConsent) {
      return NextResponse.json(
        { error: "Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar." },
        { status: 400 }
      );
    }

    const birthDateValidation = validateBirthDate(body.birthDate);
    if (!birthDateValidation.isValid) {
      return NextResponse.json(
        { error: birthDateValidation.errors[0] ?? "Data de nascimento inválida." },
        { status: 400 }
      );
    }

    if (!birthDateValidation.isOfAge) {
      return NextResponse.json(
        { error: "Você deve ter 18 anos ou mais para acessar a plataforma." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        birthDate: new Date(`${body.birthDate}T00:00:00.000Z`),
        lgpdConsent: true,
        termsConsent: true,
        consentDate: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("[complete-profile]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
