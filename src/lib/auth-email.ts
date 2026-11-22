import "server-only";
import { manualIdentityEmailIdempotencyKey, professionalPublicationEmailIdempotencyKey, professionalSubmissionReceiptIdempotencyKey } from "@/lib/email-idempotency";
import { realAccountEmail } from "@/lib/account-email";
import { beginEmailDelivery, markEmailAccepted, markEmailFailed } from "@/lib/email-delivery-tracking";

export type AuthEmailActionType =
  | "signup"
  | "recovery"
  | "invite"
  | "email_change"
  | "magiclink"
  | "reauthentication";

export type AuthEmailPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: AuthEmailActionType;
    site_url: string;
    action_link?: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

type AuthEmail = { subject: string; html: string };

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

export function confirmationUrl(tokenHash: string, type: AuthEmailActionType, redirectTo: string) {
  const url = new URL(`${getSupabaseAuthOrigin()}/auth/v1/verify`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function actionLinkWithRedirect(actionLink: string, redirectTo: string) {
  try {
    const url = new URL(actionLink);
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return null;
  }
}

function actionUrl(payload: AuthEmailPayload, tokenHash: string, type: AuthEmailActionType, redirectTo: string) {
  if (payload.email_data.action_link) {
    const actionLink = actionLinkWithRedirect(payload.email_data.action_link, redirectTo);
    if (actionLink) return actionLink;
  }

  return confirmationUrl(tokenHash, type, redirectTo);
}

export function buildAuthEmail(payload: AuthEmailPayload, options?: { confirmationCopy?: boolean }): AuthEmail | null {
  const { email_action_type, token_hash, token_hash_new, redirect_to, site_url } = payload.email_data;
  const userEmail = escapeHtml(payload.user.email);
  const siteUrl = getPublicSiteUrl(site_url);
  const redirectTo = redirect_to || siteUrl;

  const base = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fcf7ff;border:1px solid rgba(212,168,67,0.25);border-radius:12px;overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,transparent,#b72cff,#e1a6ff,#b72cff,transparent)"></div>
      <div style="padding:40px 32px">
        <div style="margin-bottom:28px;text-align:center">
          <span style="font-weight:900;font-size:24px">
            <span style="background:linear-gradient(135deg,#fcf7ff,#b72cff,#e1a6ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent">elite</span><span style="color:#fcf7ff">modell</span>
          </span>
        </div>
        CONTENT
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:#aaa0b2;font-size:12px">
          Elite Modell - Plataforma premium adulta - Brasil
        </div>
      </div>
    </div>
  `;

  const btn = (url: string, text: string) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#b72cff,#e1a6ff,#b72cff);color:#0a0a0a;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px">${escapeHtml(text)}</a>`;

  if (email_action_type === "signup") {
    const url = actionUrl(payload, token_hash, "signup", redirectTo);
    return {
      subject: "Confirme seu cadastro - Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Confirme seu cadastro</h2>
        <p style="color:#b4adb0;line-height:1.7;margin:0">Clique no botao abaixo para ativar sua conta na Elite Modell.</p>
        <div style="text-align:center">${btn(url, "Confirmar minha conta")}</div>
        <p style="color:#aaa0b2;font-size:12px;margin-top:20px">Se voce nao criou esta conta, ignore este e-mail.</p>
      `),
    };
  }

  if (email_action_type === "recovery") {
    const url = actionUrl(payload, token_hash, "recovery", redirectTo);
    return {
      subject: "Redefinir senha - Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Redefinir senha</h2>
        <p style="color:#b4adb0;line-height:1.7;margin:0">Recebemos um pedido para redefinir a senha de <strong>${userEmail}</strong>.</p>
        <div style="text-align:center">${btn(url, "Redefinir minha senha")}</div>
        <p style="color:#aaa0b2;font-size:12px;margin-top:20px">Este link expira em 1 hora. Se nao foi voce, ignore este e-mail.</p>
      `),
    };
  }

  if (email_action_type === "invite") {
    const url = actionUrl(payload, token_hash, "invite", redirectTo);
    return {
      subject: "Voce foi convidado - Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Convite Elite Modell</h2>
        <p style="color:#b4adb0;line-height:1.7;margin:0">Voce recebeu um convite para criar sua conta na Elite Modell.</p>
        <div style="text-align:center">${btn(url, "Aceitar convite")}</div>
      `),
    };
  }

  if (email_action_type === "email_change") {
    const url = actionUrl(payload, token_hash_new ?? token_hash, "email_change", redirectTo);
    return {
      subject: "Confirme seu novo e-mail - Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Confirme seu novo e-mail</h2>
        <p style="color:#b4adb0;line-height:1.7;margin:0">Clique abaixo para confirmar a alteracao do seu endereco de e-mail.</p>
        <div style="text-align:center">${btn(url, "Confirmar novo e-mail")}</div>
        <p style="color:#aaa0b2;font-size:12px;margin-top:20px">Se nao foi voce, entre em contato com o suporte.</p>
      `),
    };
  }

  if (email_action_type === "magiclink") {
    const url = actionUrl(payload, token_hash, "magiclink", redirectTo);
    if (options?.confirmationCopy) {
      return {
        subject: "Confirme seu e-mail - Elite Modell",
        html: base.replace("CONTENT", `
          <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Confirme seu endereço de e-mail</h2>
          <p style="color:#b4adb0;line-height:1.7;margin:0">Clique no botão abaixo para confirmar que você tem acesso ao endereço informado.</p>
          <div style="text-align:center">${btn(url, "Confirmar meu e-mail")}</div>
          <p style="color:#aaa0b2;font-size:12px;margin-top:20px">Este link expira e só pode ser usado uma vez. Se você não solicitou esta confirmação, ignore a mensagem.</p>
        `),
      };
    }
    return {
      subject: "Seu link de acesso - Elite Modell",
      html: base.replace("CONTENT", `
        <h2 style="color:#fcf7ff;font-size:22px;margin:0 0 12px">Link de acesso</h2>
        <p style="color:#b4adb0;line-height:1.7;margin:0">Clique no botao abaixo para entrar na sua conta.</p>
        <div style="text-align:center">${btn(url, "Entrar na minha conta")}</div>
        <p style="color:#aaa0b2;font-size:12px;margin-top:20px">Este link expira em 1 hora e so pode ser usado uma vez.</p>
      `),
    };
  }

  return null;
}

export class AuthEmailDeliveryError extends Error {
  constructor(readonly reason: string, readonly providerStatus?: number) {
    super(reason);
    this.name = "AuthEmailDeliveryError";
  }
}

export async function sendAuthEmail(
  to: string,
  email: AuthEmail,
  options?: { idempotencyKey?: string; timeoutMs?: number; professionalId?: string; category?: string; retryTransient?: boolean; requireTracking?: boolean },
) {
  const deliverableEmail = realAccountEmail(to);
  if (!deliverableEmail) {
    throw new Error("Email recipient is missing or technical");
  }
  let tracking: Awaited<ReturnType<typeof beginEmailDelivery>> | null = null;
  try {
    tracking = await beginEmailDelivery(deliverableEmail, email.subject, options);
    if (tracking.providerMessageId && tracking.status !== "PENDING") return tracking.providerMessageId;
  } catch (error) {
    if (options?.requireTracking) throw error;
    console.error("[auth-email] rastreamento indisponivel; envio preservado.", {
      reason: error instanceof Error ? error.name : "unknown",
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[auth-email] RESEND_API_KEY ausente");
    if (tracking) await markEmailFailed(tracking.id, "provider-not-configured").catch(() => undefined);
    throw new AuthEmailDeliveryError("RESEND_NOT_CONFIGURED");
  }

  const sendRequest = () => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    signal: AbortSignal.timeout(options?.timeoutMs ?? (options?.retryTransient ? 5_000 : 12_000)),
    body: JSON.stringify({
      from: process.env.EMAIL_FROM?.trim() || "Elite Modell <noreply@elitemodell.com.br>",
      to: [deliverableEmail],
      subject: email.subject,
      html: email.html,
    }),
  });
  let res: Response;
  try {
    if (options?.retryTransient && options.idempotencyKey) {
      const first = await sendRequest().catch(() => null);
      if (first && first.status < 500) {
        res = first;
      } else {
        await first?.body?.cancel().catch(() => undefined);
        res = await sendRequest();
      }
    } else {
      res = await sendRequest();
    }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    if (tracking) await markEmailFailed(tracking.id, timedOut ? "provider-timeout" : "provider-network-error").catch(() => undefined);
    throw new AuthEmailDeliveryError(timedOut ? "RESEND_TIMEOUT" : "RESEND_NETWORK_ERROR");
  }

  if (!res.ok) {
    console.error("[auth-email] Resend recusou a mensagem.", { status: res.status });
    if (tracking) await markEmailFailed(tracking.id, `provider-http-${res.status}`).catch(() => undefined);
    throw new AuthEmailDeliveryError("RESEND_HTTP_ERROR", res.status);
  }

  const payload = await res.json().catch(() => ({})) as { id?: string };
  if (tracking) await markEmailAccepted(tracking.id, payload.id ?? null).catch((error) => {
    console.error("[auth-email] falha ao registrar aceite do provedor.", {
      reason: error instanceof Error ? error.name : "unknown",
    });
  });
  console.info("[auth-email] mensagem aceita pelo provedor.", {
    providerMessageId: payload.id ?? null,
    idempotent: Boolean(options?.idempotencyKey),
  });
  return payload.id ?? null;
}

export async function sendManualIdentityEmail(input: {
  email: string;
  professionalId?: string;
  attemptId: string;
  event: "received" | "approved" | "rejected" | "resubmission";
  reviewVersion?: number;
  correctionReason?: string;
  retryForDeliveryId?: string;
}) {
  const messages = {
    received: {
      subject: "Documentos recebidos",
      body: "Olá! Recebemos seus documentos com sucesso. Sua identidade está em análise pela nossa equipe. Você receberá uma atualização quando a análise for concluída.",
    },
    approved: {
      subject: "Sua identidade foi aprovada",
      body: "Olá! Sua verificação de identidade foi aprovada pela equipe ELITE MODELL. Você já pode acompanhar a situação do seu perfil pela sua conta.",
    },
    rejected: {
      subject: "Resultado da verificação de identidade",
      body: "A análise não confirmou sua identidade com as evidências enviadas. Use um documento válido e legível, tire uma nova selfie com o documento e siga as orientações da sua conta para reenviar.",
    },
    resubmission: {
      subject: "Novo envio de documentos solicitado",
      body: "Precisamos de novas imagens para confirmar sua identidade. Abra sua conta e reenvie fotos nítidas do documento e uma selfie segurando o documento com o desafio exibido na tela.",
    },
  };
  const { subject, body } = messages[input.event];
  const path = input.event === "approved" ? "/profissional/novo" : "/profissional/identidade";
  await sendAuthEmail(input.email, {
    subject: "ELITE MODELL — " + subject,
    html: `<h1>ELITE MODELL</h1><p>${body}</p>${input.correctionReason ? `<p>${escapeHtml(input.correctionReason)}</p>` : ""}<p><a href="${DEFAULT_SITE_URL}${path}">Acessar minha conta</a></p>`,
  }, {
        idempotencyKey: manualIdentityEmailIdempotencyKey(input.attemptId, input.event, input.reviewVersion)
      + (input.retryForDeliveryId ? `:retry:${input.retryForDeliveryId}` : ""),
    professionalId: input.professionalId,
    category: "IDENTITY_" + input.event.toUpperCase(),
    retryTransient: true,
  });
}

export async function sendProfessionalSubmissionReceipt(
  to: string,
  professionalId: string,
  name?: string | null,
  deliveryAttempt = 1,
  pendingItems: string[] = [],
): Promise<string | null> {
  const safeName = name?.trim().replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] ?? character));
  const safePendingItems = pendingItems.map((item) => escapeHtml(item));
  return sendAuthEmail(to, {
    subject: "Recebemos seu cadastro na Elite Modell",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#17131a;border:1px solid #dfd1e5;border-radius:16px;overflow:hidden">
        <div style="height:4px;background:#7d179f"></div>
        <div style="padding:36px 30px">
          <div style="color:#7d179f;font-size:22px;font-weight:900;margin-bottom:24px">ELITE MODELL</div>
          <h1 style="font-size:22px;margin:0 0 14px">Seu cadastro foi recebido!</h1>
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">Olá, ${safeName || "profissional"}!</p>
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">Que bom ter você chegando à Elite Modell! 💜</p>
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">Você concluiu o preenchimento do seu cadastro com sucesso.</p>
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">Agora nossa equipe irá analisar suas informações, fotos, identidade e as validações necessárias antes da liberação do perfil.</p>
          ${safePendingItems.length ? `<ul style="color:#625c68;line-height:1.7;margin:0 0 12px">${safePendingItems.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">A análise normalmente é concluída em até 3 dias úteis. Você pode acompanhar o andamento pela sua conta e será avisada quando houver uma atualização.</p>
          <p style="color:#625c68;line-height:1.7;margin:0 0 12px">Se for necessário algum ajuste ou informação complementar, entraremos em contato.</p>
          <p style="color:#625c68;line-height:1.7;margin:0">Obrigada pela confiança e seja muito bem-vinda!<br><br>Com carinho,<br>Equipe Elite Modell 💜</p>
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #eee6f1;color:#77707b;font-size:12px">Esta mensagem não contém fotos, documentos, dados biométricos ou informações financeiras.</div>
        </div>
      </div>
    `,
  }, {
    idempotencyKey: `${professionalSubmissionReceiptIdempotencyKey(professionalId)}:attempt-${deliveryAttempt}`,
    timeoutMs: 10_000,
    professionalId,
    category: "PROFESSIONAL_SUBMISSION",
  });
}

export async function sendProfessionalPublishedEmail(to: string, professionalId: string, retryForDeliveryId?: string) {
  const key = professionalPublicationEmailIdempotencyKey(professionalId);
  await sendAuthEmail(to, {
    subject: "ELITE MODELL — Seu perfil foi aprovado!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#21172b;border:1px solid #e8def0;border-radius:16px;overflow:hidden">
        <div style="height:4px;background:#7615ab"></div>
        <div style="padding:32px">
          <h1 style="font-size:22px;margin:0 0 20px;color:#7615ab">ELITE MODELL</h1>
          <p>Olá!</p>
          <p>Temos uma ótima notícia! Seu perfil na ELITE MODELL foi aprovado pela nossa equipe.</p>
          <p>Seu cadastro foi concluído com sucesso e seu perfil está disponível na plataforma, conforme suas configurações de visibilidade.</p>
          <p>Acesse sua conta para acompanhar seu anúncio.</p>
          <p><a href="${DEFAULT_SITE_URL}/profissional">Acessar minha conta</a></p>
          <p>Equipe ELITE MODELL</p>
        </div>
      </div>
    `,
  }, {
    idempotencyKey: key + (retryForDeliveryId ? `:retry:${retryForDeliveryId}` : ""),
    professionalId,
    category: "PROFESSIONAL_PUBLISHED",
    requireTracking: true,
    retryTransient: true,
  });
}
