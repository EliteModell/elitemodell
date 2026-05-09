export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  idToken: z.string(),
  role: z.enum(["GUEST", "HOST"]).default("GUEST"),
  category: z.enum(["HETERO", "TRANS", "MULHER"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, role, category } = schema.parse(body);

    const { adminAuth } = await import("@/lib/firebase-admin");
    const decoded = await adminAuth.verifyIdToken(idToken);

    if (!decoded.email) {
      return NextResponse.json({ error: "Email não encontrado" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const user = await prisma.user.create({
      data: {
        email: decoded.email,
        name: decoded.name ?? null,
        image: decoded.picture ?? null,
        role,
        category: category ?? null,
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
