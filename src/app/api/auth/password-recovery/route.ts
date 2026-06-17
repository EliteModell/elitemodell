export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAuthEmail, sendAuthEmail } from "@/lib/auth-email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

const schema = z.object({
  email: z.string().email(),
});

function publicAppOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.elitemodell.com.br").replace(/\/+$/, "");
}

function recoveryRedirectUrl() {
  const url = new URL("/auth/callback", publicAppOrigin());
  url.searchParams.set("flow", "recovery");
  url.searchParams.set("returnUrl", "/redefinir-senha");
  return url.toString();
}

function isUserNotFound(message?: string) {
  return /not found|no user|unable to validate email address/i.test(message ?? "");
}

export async function POST(req: NextRequest) {
  const requestIp = getClientIP(req);
  const limited = await enforceRateLimitAsync(
    `password-recovery:${requestIp}`,
    8,
    60 * 60 * 1000,
    "Muitas tentativas de recuperacao. Tente novamente mais tarde."
  );
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const supabase = createSupabaseServerClient();
    const redirectTo = recoveryRedirectUrl();

    const generated = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (generated.error) {
      if (isUserNotFound(generated.error.message)) {
        console.info("[password-recovery] email nao encontrado; resposta generica", { requestIp });
        return NextResponse.json({ ok: true });
      }
      console.error("[password-recovery] Supabase generateLink falhou", generated.error.message);
      return NextResponse.json({ error: "Nao foi possivel gerar o link de recuperacao." }, { status: 500 });
    }

    const properties = generated.data.properties;
    const tokenHash = properties?.hashed_token;
    if (!tokenHash) {
      console.error("[password-recovery] Supabase nao retornou hashed_token");
      return NextResponse.json({ error: "Nao foi possivel gerar o link de recuperacao." }, { status: 500 });
    }

    const authEmail = buildAuthEmail({
      user: { email },
      email_data: {
        token: "",
        token_hash: tokenHash,
        redirect_to: properties.redirect_to || redirectTo,
        email_action_type: "recovery",
        site_url: process.env.NEXT_PUBLIC_APP_URL || "https://www.elitemodell.com.br",
        action_link: properties.action_link,
      },
    });

    if (!authEmail) {
      return NextResponse.json({ error: "Nao foi possivel montar o email de recuperacao." }, { status: 500 });
    }

    await sendAuthEmail(email, authEmail);
    console.info("[password-recovery] email enviado", { requestIp });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Email invalido." }, { status: 400 });
    }
    console.error("[password-recovery]", err);
    return NextResponse.json({ error: "Nao foi possivel enviar o email de recuperacao." }, { status: 500 });
  }
}
