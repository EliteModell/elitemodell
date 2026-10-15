export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailVerificationAttempt } from "@/lib/email-verification-attempt";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

const schema = z.object({ token: z.string().min(20) });

export async function POST(req: NextRequest) {
  try {
    const { token } = schema.parse(await req.json());
    const attempt = verifyEmailVerificationAttempt(token);
    if (!attempt) {
      return NextResponse.json({ status: "expired" }, { status: 410 });
    }

    const tokenKey = createHash("sha256").update(token).digest("hex").slice(0, 24);
    const limited = await enforceRateLimitAsync(
      `email-verification-status:${getClientIP(req)}:${tokenKey}`,
      160,
      10 * 60 * 1000,
      "Muitas consultas de confirmacao. Aguarde um instante.",
    );
    if (limited) return limited;

    const { data, error } = await createSupabaseServerClient().auth.admin.getUserById(attempt.userId);
    if (error || !data.user) {
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }

    const providerEmail = data.user.email?.trim().toLowerCase();
    if (providerEmail !== attempt.email) {
      return NextResponse.json({ error: "Tentativa de cadastro invalida." }, { status: 403 });
    }

    return NextResponse.json(
      { status: data.user.email_confirmed_at ? "verified" : "pending" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Tentativa de cadastro invalida." }, { status: 400 });
    }
    console.error("[email-verification-status] falha ao consultar provedor");
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
