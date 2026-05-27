export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { ensureProfileForIntent } from "@/lib/account-profiles";

const schema = z.object({
  category: z.enum(["MULHER", "HOMEM", "TRANS"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  await ensureProfileForIntent(session.user.id, "profissional", parsed.data.category);

  return NextResponse.json({ ok: true });
}
