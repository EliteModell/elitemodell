export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAgeOfMajority } from "@/lib/age-validation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  accessToken: z.string(),
  role: z.enum(["GUEST", "HOST"]).default("GUEST"),
  accountType: z.enum(["GUEST", "PROFESSIONAL", "PROPERTY_HOST"]).optional(),
  category: z.enum(["TRANS", "MULHER", "HOMEM"]).optional(),
  birthDate: z.string().optional(),
  lgpdConsent: z.boolean().default(false),
  termsConsent: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, role, category, birthDate, lgpdConsent, termsConsent } = schema.parse(body);

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Sessao Supabase invalida." }, { status: 401 });
    }

    const authUser = data.user;
    const phone = authUser.phone?.replace(/\D/g, "").replace(/^55/, "");
    const email = authUser.email ?? (phone ? `phone_${phone}@sms.elitemodell.local` : null);

    if (!email) {
      return NextResponse.json({ error: "Email ou telefone não encontrado" }, { status: 400 });
    }

    if (!birthDate || !isAgeOfMajority(birthDate)) {
      return NextResponse.json(
        { error: "Você deve ter 18 anos ou mais para se registrar" },
        { status: 400 }
      );
    }

    if (!lgpdConsent || !termsConsent) {
      return NextResponse.json(
        { error: "Você deve aceitar os Termos de Uso e Política de Privacidade" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name ?? (authUser.user_metadata?.name as string | undefined) ?? null,
          image: existing.image ?? (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
          phone: existing.phone ?? phone ?? null,
          role: existing.role === "ADMIN" ? "ADMIN" : role,
          category: category ?? existing.category,
          birthDate: new Date(birthDate),
          lgpdConsent: existing.lgpdConsent || lgpdConsent,
          termsConsent: existing.termsConsent || termsConsent,
          consentDate: existing.consentDate ?? new Date(),
        },
        select: { id: true, name: true, email: true, role: true },
      });

      if (role === "HOST") {
        await prisma.hostProfile.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id },
          update: {},
        });
      }

      return NextResponse.json(user, { status: 200 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: (authUser.user_metadata?.name as string | undefined) ?? authUser.email ?? phone ?? null,
        image: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        phone: phone ?? null,
        role,
        category: category ?? null,
        birthDate: new Date(birthDate),
        lgpdConsent,
        termsConsent,
        consentDate: new Date(),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (role === "HOST") {
      await prisma.hostProfile.create({ data: { userId: user.id } });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
