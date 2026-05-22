export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { postLoginPathFromUser } from "@/lib/account-routes";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  city: z.string().min(2).max(80).optional(),
  state: z.string().min(2).max(40).optional(),
  document: z.string().optional(),
  image: z.string().url().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, image: true, phone: true, phoneVerified: true, phoneVerifiedAt: true,
      city: true, state: true, document: true, role: true, accountType: true, category: true, birthDate: true, verified: true, credits: true,
      lgpdConsent: true, termsConsent: true,
      createdAt: true, hostProfile: true, professional: {
        select: {
          id: true,
          slug: true,
          status: true,
          displayName: true,
          bio: true,
          city: true,
          state: true,
          phone: true,
          whatsapp: true,
          instagram: true,
          website: true,
          priceMin: true,
          priceMax: true,
          image: true,
          galleryUrls: true,
          specialties: { select: { name: true } },
        },
      },
      properties: { select: { id: true, status: true }, orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(user ? { ...user, redirectTo: postLoginPathFromUser(user) } : null);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.phone) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true },
      });
      const normalized = data.phone.replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
      if (normalized && normalized !== current?.phone) {
        return NextResponse.json(
          { error: "Altere o telefone pelo fluxo de verificacao por codigo." },
          { status: 400 }
        );
      }
      delete data.phone;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true, phone: true, role: true },
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
