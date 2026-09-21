export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { buildAuthEmail, sendAuthEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync } from "@/lib/security";
import { buildEmailAuthCallbackUrl } from "@/lib/email-auth-callback";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("change"), email: z.string().trim().email() }),
]);

function callbackUrl() {
  const params = new URLSearchParams({
    returnUrl: "/profissional/novo",
    role: "profissional",
    flow: "cadastro",
    intent: "professional-signup",
  });
  return buildEmailAuthCallbackUrl(params);
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "endereço informado";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseServerClient();
  for (let page = 1; page <= 10; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const found = result.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (result.data.users.length < 100) break;
  }
  return null;
}

async function sendConfirmation(email: string) {
  const supabase = createSupabaseServerClient();
  const redirectTo = callbackUrl();
  const generated = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (generated.error) throw generated.error;
  const properties = generated.data.properties;
  const tokenHash = properties?.hashed_token;
  if (!tokenHash) throw new Error("confirmation_link_unavailable");
  const message = buildAuthEmail({
    user: { email },
    email_data: {
      token: "",
      token_hash: tokenHash,
      redirect_to: properties.redirect_to || redirectTo,
      email_action_type: "magiclink",
      site_url: process.env.NEXT_PUBLIC_APP_URL || "https://www.elitemodell.com.br",
      action_link: properties.action_link,
    },
  }, { confirmationCopy: true });
  if (!message) throw new Error("confirmation_email_unavailable");
  await sendAuthEmail(email, message);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const limited = await enforceRateLimitAsync(
    `email-confirmation:${session.user.id}`,
    4,
    15 * 60 * 1000,
    "Aguarde alguns minutos antes de solicitar outro e-mail.",
  );
  if (limited) return limited;

  try {
    const input = inputSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, verified: true, maskedEmail: maskEmail(user.email) });

    let targetEmail = user.email;
    if (input.action === "change") {
      targetEmail = input.email.toLowerCase();
      if (targetEmail !== user.email.toLowerCase()) {
        const conflict = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } });
        if (conflict && conflict.id !== user.id) {
          return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 409 });
        }
        const authUser = await findAuthUserByEmail(user.email);
        if (!authUser) return NextResponse.json({ error: "Não foi possível localizar a conta de autenticação." }, { status: 409 });
        const supabase = createSupabaseServerClient();
        const updated = await supabase.auth.admin.updateUserById(authUser.id, {
          email: targetEmail,
          email_confirm: false,
          user_metadata: { ...authUser.user_metadata, prismaUserId: user.id },
        });
        if (updated.error) throw updated.error;
        await prisma.user.update({ where: { id: user.id }, data: { email: targetEmail, emailVerified: null } });
      }
    }

    await sendConfirmation(targetEmail);
    return NextResponse.json({ ok: true, verified: false, maskedEmail: maskEmail(targetEmail) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    console.error("[email-confirmation] falha", {
      userId: session.user.id,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Não foi possível solicitar a confirmação agora." }, { status: 502 });
  }
}
