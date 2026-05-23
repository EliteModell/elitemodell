export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAgeOfMajority } from "@/lib/age-validation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimit, getClientIP } from "@/lib/security";

const schema = z.object({
  accessToken: z.string(),
  accountType: z.enum(["GUEST", "PROFESSIONAL", "PROPERTY_HOST"]).optional(),
  category: z.enum(["TRANS", "MULHER", "HOMEM"]).optional(),
  birthDate: z.string().optional(),
  lgpdConsent: z.boolean().default(false),
  termsConsent: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(`register:${getClientIP(req)}`, 20, 60 * 60 * 1000, "Muitas tentativas de cadastro. Tente novamente mais tarde.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { accessToken, accountType, category, birthDate, lgpdConsent, termsConsent } = schema.parse(body);
    const publicAccountType = accountType === "PROFESSIONAL" ? "model" : "client";

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Sessão Supabase inválida." }, { status: 401 });
    }

    const authUser = data.user;
    const phone = authUser.phone?.replace(/\D/g, "").replace(/^55/, "");
    const email = authUser.email ?? (phone ? `phone_${phone}@sms.elitemodell.local` : null);

    if (!email) {
      return NextResponse.json({ error: "Email ou telefone não encontrado" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    const hasBirthDate = Boolean(birthDate || existing?.birthDate);
    const birthDateIsValid = birthDate ? isAgeOfMajority(birthDate) : Boolean(existing?.birthDate);

    if (!hasBirthDate || !birthDateIsValid) {
      return NextResponse.json(
        { error: "Você deve ter 18 anos ou mais para se registrar" },
        { status: 400 }
      );
    }

    if (!(lgpdConsent || existing?.lgpdConsent) || !(termsConsent || existing?.termsConsent)) {
      return NextResponse.json(
        { error: "Você deve aceitar os Termos de Uso e Política de Privacidade" },
        { status: 400 }
      );
    }

    if (existing) {
      // Segurança: nunca alterar role/accountType/category de conta existente.
      // Evita que um cliente se autopromova a modelo/anfitrião via parâmetro.
      // Upgrades legítimos devem usar endpoints dedicados com verificação adicional.
      const isProtectedAccount = existing.role === "ADMIN" ||
        existing.accountType === "model" ||
        existing.accountType === "host";

      if (isProtectedAccount && existing.accountType !== publicAccountType) {
        // Conta já tem tipo definido — retorna sucesso sem alterar tipo
        return NextResponse.json(
          { id: existing.id, name: existing.name, email: existing.email, role: existing.role },
          { status: 200 }
        );
      }

      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name ?? (authUser.user_metadata?.name as string | undefined) ?? null,
          image: existing.image ?? (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
          phone: existing.phone ?? phone ?? null,
          // Preserva role e accountType originais — não permite mudança via request
          role: existing.role,
          accountType: existing.accountType,
          category: existing.category ?? category,
          birthDate: birthDate ? new Date(birthDate) : existing.birthDate,
          lgpdConsent: existing.lgpdConsent || lgpdConsent,
          termsConsent: existing.termsConsent || termsConsent,
          consentDate: existing.consentDate ?? new Date(),
        },
        select: { id: true, name: true, email: true, role: true },
      });

      if (existing.role === "HOST" && existing.accountType === "model") {
        await prisma.hostProfile.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id },
          update: {},
        });
      }

      return NextResponse.json(user, { status: 200 });
    }

    if (!birthDate) {
      return NextResponse.json(
        { error: "Você deve ter 18 anos ou mais para se registrar" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: (authUser.user_metadata?.name as string | undefined) ?? authUser.email ?? phone ?? null,
        image: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        phone: phone ?? null,
        role: "GUEST",
        accountType: publicAccountType,
        category: category ?? null,
        birthDate: new Date(birthDate),
        lgpdConsent,
        termsConsent,
        consentDate: new Date(),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
