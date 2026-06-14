export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type EmailActionType =
  | "signup"
  | "recovery"
  | "invite"
  | "email_change"
  | "magiclink"
  | "reauthentication";

type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const DEFAULT_SITE_URL = "https://www.elitemodell.com.br";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getSupabaseAuthOrigin() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente para montar link de confirmacao.");
  }
  return trimTrailingSlash(configured);
}

function getPublicSiteUrl(payloadSiteUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return trimTrailingSlash(configured || payloadSiteUrl || DEFAULT_SITE_URL);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confirmationUrl(tokenHash: string, type: EmailActionType, redirectTo: string) {
  const url = new URL(`${getSupabaseAuthOrigin()}/auth/v1/verify`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function buildEmail(payload: HookPayload): { subject: string; html: string } | null {
  const { email_action_type, token_hash, token_hash_new, redirect_to, site_url } = payload.email_data;
  const userEmail = escapeHtml(payload.user.email);
  const siteUrl = getPublicSiteUrl(site_url);
  const redirectTo = redirect_to || siteUrl;

  const base = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f1f5f9;border:1px solid rgba(212,168,67,0.25);border-radius:12px;overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,transparent,#d4a843,#f5d78c,#d4a843,transparent)"></div>
      <div style="padding:40px 32px">
        <div style="margin-bottom:28px;text-align:center">
          <span style="font-weight:900;font-size:24px">
            <span style="background:linear-gradient(135deg,#ffe5a0,#d4a843,#f5d78c);-webkit-background-clip:text;-webkit-text-fill-color:transparent">elite</span><span style="color:#f1f5f9">modell</span>
          </span>
        </div>
        CONTENT
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:#475569;font-size:12px">
          Elite Modell · Plataforma premium adulta · Brasil
        </div>
      </div>
    </div>
  `;

  const btn = (url: string, text: string) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#d4a843,#f5d78c,#d4a843);color:#0a0a0a;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px">${escapeHtml(text)}</a>`;

  if (email_action_type === "signup") {
    const url = confirmationUrl(token_hash, "signup", redirectTo);
    return {
      subject: "Confirme seu cadastro — Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px">Confirme seu cadastro</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0">Clique no botão abaixo para ativar sua conta na Elite Modell.</p>
        <div style="text-align:center">${btn(url, "Confirmar minha conta")}</div>
        <p style="color:#475569;font-size:12px;margin-top:20px">Se você não criou esta conta, ignore este e-mail.</p>
      `),
    };
  }

  if (email_action_type === "recovery") {
    const url = confirmationUrl(token_hash, "recovery", redirectTo);
    return {
      subject: "Redefinir senha — Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px">Redefinir senha</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0">Recebemos um pedido para redefinir a senha de <strong>${userEmail}</strong>.</p>
        <div style="text-align:center">${btn(url, "Redefinir minha senha")}</div>
        <p style="color:#475569;font-size:12px;margin-top:20px">Este link expira em 1 hora. Se não foi você, ignore este e-mail.</p>
      `),
    };
  }

  if (email_action_type === "invite") {
    const url = confirmationUrl(token_hash, "invite", redirectTo);
    return {
      subject: "Você foi convidado — Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px">Convite Elite Modell</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0">Você recebeu um convite para criar sua conta na Elite Modell.</p>
        <div style="text-align:center">${btn(url, "Aceitar convite")}</div>
      `),
    };
  }

  if (email_action_type === "email_change") {
    const url = confirmationUrl(token_hash_new ?? token_hash, "email_change", redirectTo);
    return {
      subject: "Confirme seu novo e-mail — Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px">Confirme seu novo e-mail</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0">Clique abaixo para confirmar a alteração do seu endereço de e-mail.</p>
        <div style="text-align:center">${btn(url, "Confirmar novo e-mail")}</div>
        <p style="color:#475569;font-size:12px;margin-top:20px">Se não foi você, entre em contato com o suporte.</p>
      `),
    };
  }

  if (email_action_type === "magiclink") {
    const url = confirmationUrl(token_hash, "magiclink", redirectTo);
    return {
      subject: "Seu link de acesso — Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px">Link de acesso</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0">Clique no botão abaixo para entrar na sua conta.</p>
        <div style="text-align:center">${btn(url, "Entrar na minha conta")}</div>
        <p style="color:#475569;font-size:12px;margin-top:20px">Este link expira em 1 hora e só pode ser usado uma vez.</p>
      `),
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as HookPayload;

    const email = buildEmail(payload);
    if (!email) {
      return NextResponse.json({});
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("[send-email] RESEND_API_KEY ausente");
      return NextResponse.json({ error: "Email provider not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || `Elite Modell <noreply@elitemodell.com.br>`,
        to: [payload.user.email],
        subject: email.subject,
        html: email.html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[send-email] Resend error:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({});
  } catch (err) {
    console.error("[send-email]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
