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
import { isTechnicalPhoneEmail, realAccountEmail } from "@/lib/account-email";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("change"), email: z.string().trim().email() }),
]);

const RECENT_PHONE_PROOF_MS = 30 * 60 * 1000;

function hasRecentPhoneProof(user: { phone: string | null; phoneVerified: boolean; phoneVerifiedAt: Date | null }) {
  return Boolean(user.phone && user.phoneVerified && user.phoneVerifiedAt && Date.now() - user.phoneVerifiedAt.getTime() <= RECENT_PHONE_PROOF_MS);
}

function callbackUrl() {
  const params = new URLSearchParams({
    returnUrl: "/profissional/novo",
    role: "profissional",
    flow: "cadastro",
    intent: "professional-signup",
  });
  return buildEmailAuthCallbackUrl(params);
}

function maskEmail(email: string | null | undefined) {
  const deliverableEmail = realAccountEmail(email);
  if (!deliverableEmail) return null;
  const [local, domain] = deliverableEmail.split("@");
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

async function findAuthUserForAccount(userId: string, email: string) {
  const supabase = createSupabaseServerClient();
  for (let page = 1; page <= 10; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const found = result.data.users.find((authUser) => {
      const linkedUserId = typeof authUser.app_metadata?.prismaUserId === "string"
        ? authUser.app_metadata.prismaUserId
        : null;
      return linkedUserId === userId || authUser.email?.toLowerCase() === email.toLowerCase();
    });
    if (found) return found;
    if (result.data.users.length < 100) break;
  }
  return null;
}

async function reconcileConfirmedEmail(user: { id: string; email: string; emailVerified: Date | null }) {
  if (user.emailVerified) return { verified: true, email: user.email };
  const authUser = await findAuthUserForAccount(user.id, user.email);
  if (!authUser?.email) return { verified: false, email: user.email };
  const linkedUserId = typeof authUser.app_metadata?.prismaUserId === "string"
    ? authUser.app_metadata.prismaUserId
    : null;
  const confirmedEmail = authUser.email.toLowerCase();
  if (linkedUserId && linkedUserId !== user.id) return { verified: false, email: user.email };
  if (!linkedUserId && confirmedEmail !== user.email.toLowerCase()) return { verified: false, email: user.email };
  if (!authUser.email_confirmed_at) return { verified: false, email: confirmedEmail };
  const conflict = await prisma.user.findUnique({ where: { email: confirmedEmail }, select: { id: true } });
  if (conflict && conflict.id !== user.id) return { verified: false, email: user.email };
  await prisma.user.update({
    where: { id: user.id },
    data: { email: confirmedEmail, emailVerified: new Date(authUser.email_confirmed_at) },
  });
  return { verified: true, email: confirmedEmail };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({
      error: error instanceof z.ZodError ? "Informe uma ação válida." : "Não foi possível interpretar a solicitação.",
    }, { status: 400 });
  }

  const limited = await enforceRateLimitAsync(
    `email-confirmation:${input.action}:${session.user.id}`,
    input.action === "status" ? 30 : 4,
    15 * 60 * 1000,
    "Aguarde alguns minutos antes de solicitar outro e-mail.",
  );
  if (limited) return limited;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true, phone: true, phoneVerified: true, phoneVerifiedAt: true },
    });
    if (!user) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const reconciled = await reconcileConfirmedEmail(user);
    if (reconciled.verified) return NextResponse.json({ ok: true, verified: true, maskedEmail: maskEmail(reconciled.email) });
    if (input.action === "status") {
      return NextResponse.json({
        ok: true,
        verified: false,
        emailState: realAccountEmail(reconciled.email) ? "unconfirmed" : "missing",
        maskedEmail: maskEmail(reconciled.email),
      });
    }

    let targetEmail = user.email;
    if (input.action === "change") {
      targetEmail = input.email.toLowerCase();
      if (targetEmail !== user.email.toLowerCase()) {
        const conflict = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } });
        if (conflict && conflict.id !== user.id) {
          return NextResponse.json({ error: "Este e-mail já está vinculado a outra conta. Utilize outro endereço ou entre em contato com o suporte." }, { status: 409 });
        }
        let targetAuthUser = await findAuthUserByEmail(targetEmail);
        const linkedPrismaUserId = typeof targetAuthUser?.app_metadata?.prismaUserId === "string"
          ? targetAuthUser.app_metadata.prismaUserId
          : null;
        if (targetAuthUser && linkedPrismaUserId && linkedPrismaUserId !== user.id) {
          const releasedIdentity = await prisma.user.findUnique({
            where: { id: linkedPrismaUserId },
            select: { blocked: true, blockReason: true, email: true },
          });
          const wasAnonymizedByDeletion = Boolean(
            releasedIdentity?.blocked
            && releasedIdentity.blockReason === "Conta excluida e pseudonimizada por solicitacao LGPD."
            && releasedIdentity.email.startsWith("deleted+"),
          );
          if (wasAnonymizedByDeletion) {
            const supabase = createSupabaseServerClient();
            const removed = await supabase.auth.admin.deleteUser(targetAuthUser.id);
            if (removed.error && !/not found/i.test(removed.error.message)) throw removed.error;
            targetAuthUser = null;
          }
        }
        const targetBelongsToCurrentUser = targetAuthUser?.app_metadata?.prismaUserId === user.id;
        if (targetAuthUser && !targetBelongsToCurrentUser) {
          return NextResponse.json({ error: "Este e-mail já está vinculado a outra conta. Utilize outro endereço ou entre em contato com o suporte." }, { status: 409 });
        }
        const authUser = await findAuthUserByEmail(user.email);
        const supabase = createSupabaseServerClient();
        if (targetBelongsToCurrentUser) {
          // Solicitação idempotente: o endereço continua pendente até o link
          // ser confirmado e pode receber um novo envio com segurança.
        } else if (authUser) {
          const updated = await supabase.auth.admin.updateUserById(authUser.id, {
            email: targetEmail,
            email_confirm: false,
            app_metadata: { ...authUser.app_metadata, prismaUserId: user.id },
          });
          if (updated.error) throw updated.error;
        } else {
          if (!isTechnicalPhoneEmail(user.email)) {
            return NextResponse.json({ error: "Não foi possível validar a conta com segurança. Entre novamente e tente de novo." }, { status: 409 });
          }
          const initialEmailAssociation = isTechnicalPhoneEmail(user.email) && user.phoneVerified;
          if (!initialEmailAssociation && !hasRecentPhoneProof(user)) {
            return NextResponse.json({ error: "Confirme novamente seu telefone para alterar o e-mail." }, { status: 401 });
          }
          const created = await supabase.auth.admin.createUser({
            email: targetEmail,
            email_confirm: false,
            app_metadata: { prismaUserId: user.id, linkedFromPhone: true },
          });
          if (created.error) throw created.error;
        }
      }
    } else if (isTechnicalPhoneEmail(targetEmail)) {
      return NextResponse.json({ error: "Informe um e-mail real para receber a confirmação." }, { status: 400 });
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
